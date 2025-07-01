import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

/* ------------------------------------------------------------------ */
/* 统一取当前登录项目经理 ID                                            */
/* ------------------------------------------------------------------ */
const secret = process.env.NEXTAUTH_SECRET;

async function getManagerId(req: NextRequest): Promise<number | undefined> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === 'manager' && session.user.id) return session.user.id;

  const token = await getToken({ req, secret });
  if (token?.role === 'manager' && token?.sub) return Number(token.sub);

  return undefined;
}

/* ------------------------------------------------------------------ */
/* 工具：根据任务分配 & 截止日期 计算项目状态                          */
/* ------------------------------------------------------------------ */
function calcStatus(assignments: any[], deadline: string): string {
  const allPending   = assignments.every(a => a.status === 'pending');
  const anyRejected  = assignments.some(a => a.status === 'rejected');
  const allCompleted = assignments.every(a => a.status === 'completed');
  const now          = new Date();
  const end          = new Date(deadline);

  if (allPending) return '分配中';
  if (anyRejected) return '请重新分配任务';
  if (allCompleted) return '待验收';
  if (now > end)   return '超时未完成';
  return '进行中';
}

/* ------------------------------------------------------------------ */
/* GET                                                                */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const managerId = await getManagerId(req);
  if (!managerId) return NextResponse.json({ error: '无权限' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const language = searchParams.get('language');
  const task     = searchParams.get('task');
  const keyword  = searchParams.get('keyword') ?? '';

  /* ---- ① 项目经理挑选接单员 ---- */
  if (language && task) {
    const sql = `
      SELECT DISTINCT u.id, u.username, u.name
        FROM member_users  u
        JOIN member_skills s ON s.member_id = u.id
       WHERE u.status   = 'active'
         AND s.language = ?
         AND s.task     = ?
         ${keyword ? 'AND (u.username LIKE ? OR u.name LIKE ?)' : ''}
       ORDER BY u.name
    `;
    const params = keyword
      ? [language, task, `%${keyword}%`, `%${keyword}%`]
      : [language, task];

    const members = db.prepare(sql).all(...params);
    return NextResponse.json({ members });
  }

  /* ---- ② 返回经理全部项目 ---- */
  const projects = db
    .prepare(`SELECT * FROM projects WHERE manager_id = ? ORDER BY id DESC`)
    .all(managerId);

  const assignStmt = db.prepare(`
    SELECT a.*,
           u.name AS member_name
      FROM project_assignments a
      JOIN member_users      u ON u.id = a.member_id
     WHERE a.project_id = ?
     ORDER BY
       CASE a.role
         WHEN '翻译' THEN 1
         WHEN '质检' THEN 2
         WHEN '后期' THEN 3
         WHEN '审核' THEN 4
         ELSE 5
       END
  `);

  for (const p of projects) {
    p.assignments   = assignStmt.all(p.id);
    p.projectStatus = calcStatus(p.assignments, p.deadline);
  }

  return NextResponse.json(projects);
}

/* ------------------------------------------------------------------ */
/* POST：创建新项目                                                    */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  const managerId = await getManagerId(req);
  if (!managerId) return NextResponse.json({ error: '无权限' }, { status: 403 });

  const {
    title,
    episode,
    language,
    minutes,
    deadline,
    assignments,
  } = await req.json();

  if (!title || !episode || !language || !minutes || !deadline || !assignments) {
    return NextResponse.json({ error: '字段不完整' }, { status: 400 });
  }

  const result = db.prepare(
    `INSERT INTO projects
       (title, episode, language, minutes, deadline, manager_id, accepted)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).run(title, episode, language, minutes, deadline, managerId);

  const projectId = result.lastInsertRowid as number;

  const assignStmt = db.prepare(
    `INSERT INTO project_assignments
       (project_id, member_id, role, minutes, status, deadline)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const [role, memberId] of Object.entries(assignments)) {
    assignStmt.run(projectId, Number(memberId), role, minutes, 'pending', deadline);
  }

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ */
/* PATCH：经理在“待验收”时确认验收                                    */
/* ------------------------------------------------------------------ */
export async function PATCH(req: NextRequest) {
  const managerId = await getManagerId(req);
  if (!managerId) return NextResponse.json({ error: '无权限' }, { status: 403 });

  const { projectId } = await req.json();
  if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });

  const result = db
    .prepare(`UPDATE projects
                 SET accepted = 1
               WHERE id = ? AND manager_id = ?`)
    .run(projectId, managerId);

  if (result.changes === 0)
    return NextResponse.json({ error: '无此项目或无权限' }, { status: 400 });

  return NextResponse.json({ ok: true });
}
