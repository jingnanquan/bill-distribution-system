import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { parse } from 'url'; 

const secret = process.env.NEXTAUTH_SECRET;

/* ---------- 帮助函数：取得 memberId ---------- */
async function getMemberId(req: NextRequest): Promise<number | undefined> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === 'member' && session.user.id)
    return session.user.id;

  const token = await getToken({ req, secret });
  if (token?.role === 'member' && token?.sub) return Number(token.sub);

  return undefined;
}

/* ---------- GET /api/member/assignments ---------- */
/* ---------- GET /api/member/assignments ---------- */
export async function GET(req: NextRequest) {
  const memberId = await getMemberId(req);
  if (!memberId) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  let startDate: Date, endDate: Date;
  if (month) {
    const [year, monthIndex] = month.split('-').map(Number);
    startDate = new Date(year, monthIndex - 1, 1);
    endDate = new Date(year, monthIndex, 1);
  } else {
    const today = new Date();
    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    endDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const rows = db
    .prepare(
      `SELECT pa.*, p.title, p.language, p.minutes AS project_minutes,
              p.deadline AS project_deadline
         FROM project_assignments pa
         JOIN projects p ON pa.project_id = p.id
        WHERE pa.member_id = ?`
    )
    .all(memberId);

  const pending = rows.filter((r: any) => r.status === 'pending');
  const accepted = rows.filter((r: any) => r.status === 'accepted');

  const completed = db
    .prepare(
      `SELECT pa.*, p.title, p.language, p.minutes AS project_minutes
         FROM project_assignments pa
         JOIN projects p ON pa.project_id = p.id
        WHERE pa.member_id = ?
          AND pa.status = 'completed'
          AND pa.completed_time >= ?
          AND pa.completed_time < ?`
    )
    .all(memberId, startDate.toISOString(), endDate.toISOString());

  const skills = db
    .prepare(
      `SELECT language, task, price, rating
         FROM member_skills
        WHERE member_id = ?`
    )
    .all(memberId);

  const availableMonths = db
    .prepare(
      `SELECT DISTINCT strftime('%Y-%m', completed_time) AS month
         FROM project_assignments
        WHERE member_id = ?
          AND status = 'completed'
          AND completed_time IS NOT NULL
        ORDER BY completed_time DESC`
    )
    .all(memberId)
    .map((row: any) => row.month);

  return NextResponse.json({
    pending,
    accepted,
    completed,
    skills,
    availableMonths,
  });
}

/* ---------- PATCH /api/member/assignments ---------- */
export async function PATCH(req: NextRequest) {
    const memberId = await getMemberId(req);
    if (!memberId) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
  
    const { assignmentId, action } = await req.json();
    const assignment = db
      .prepare(`SELECT * FROM project_assignments WHERE id = ?`)
      .get(assignmentId);
  
    if (!assignment || assignment.member_id !== memberId) {
      return NextResponse.json({ error: '任务不存在或无权限' }, { status: 404 });
    }
  
    switch (action) {
      case 'accept':
        db.prepare(
          `UPDATE project_assignments SET status = 'accepted' WHERE id = ?`,
        ).run(assignmentId);
        break;
  
      case 'reject':
        db.prepare(
          `UPDATE project_assignments SET status = 'rejected' WHERE id = ?`,
        ).run(assignmentId);
        break;
  
      case 'complete': {
        const now = new Date();
        const deadline = new Date(assignment.deadline);
        let deductionNote: string | null = null;
  
        // 判断是否逾期
        if (now > deadline) {
          const diffDays = Math.ceil(
            (now.getTime() - deadline.getTime()) / 86400000,
          );
          deductionNote = `超时${diffDays}天`;
        }
  
        // 转换为北京时间
        const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // +8小时
  
        const formattedTime = bjTime.toISOString().replace('T', ' ').substring(0, 19); // '2025-06-02 12:34:56'
  
        db.prepare(
          `UPDATE project_assignments
             SET status = 'completed',
                 completed_time = ?,
                 deduction_note = ?
           WHERE id = ?`,
        ).run(formattedTime, deductionNote, assignmentId);
        break;
      }
  
      default:
        return NextResponse.json({ error: '未知动作' }, { status: 400 });
    }
  
    return NextResponse.json({ ok: true });
  }
  