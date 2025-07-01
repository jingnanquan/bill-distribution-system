import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/* ------------------------------------------------------------------ *
 * GET                                                                *
 *   A. /api/admin/users?name=张三            -> managers + members    *
 *      （仍兼容 ?keyword=张三）                                      *
 *                                                                    *
 *   B. /api/admin/users?memberId=123         -> skills for member     *
 * ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId');

  /* ---------- B. 查询指定接单员的技能 ---------- */
  if (memberId) {
    const skills = db
      .prepare(
        `SELECT id, language, task, price, rating
           FROM member_skills
          WHERE member_id = ?`,
      )
      .all(Number(memberId));

    return NextResponse.json({ skills });
  }

  /* ---------- A. 查询（项目经理 + 接单员）列表 ---------- */
  /* 前端已改为传 name；为兼容旧调用，仍接受 keyword */
  const nameParam = searchParams.get('name') ?? searchParams.get('keyword') ?? '';
  const where     = nameParam ? `WHERE name LIKE ?` : '';
  const value     = nameParam ? [`%${nameParam}%`] : [];

  const managers = db
    .prepare(
      `SELECT id, username, name, phone, email, status
         FROM manager_users ${where}`,
    )
    .all(...value);

  const members = db
    .prepare(
      `SELECT id, username, name, phone, email, status
         FROM member_users ${where}`,
    )
    .all(...value);

  return NextResponse.json({ managers, members });
}

/* ------------------------------------------------------------------ *
 * PATCH：更新信息（含技能覆盖）                                       *
 * ------------------------------------------------------------------ */
export async function PATCH(req: NextRequest) {
  const body   = await req.json();
  const { id, role, skills = [], ...fields } = body;

  /* --- 更新用户基本字段 -------------------------------------------- */
  const table = role === 'manager' ? 'manager_users' : 'member_users';
  const keys  = Object.keys(fields);

  if (keys.length) {
    const updates = keys.map((k) => `${k} = ?`).join(', ');
    const values  = keys.map((k) => fields[k]);
    db.prepare(`UPDATE ${table} SET ${updates} WHERE id = ?`).run(...values, id);
  }

  /* --- 如角色为 member 且附带 skills，则覆盖式重写 ------------------ */
  if (role === 'member' && Array.isArray(skills)) {
    db.prepare(`DELETE FROM member_skills WHERE member_id = ?`).run(id);

    if (skills.length) {
      const insertSkill = db.prepare(
        `INSERT INTO member_skills
           (member_id, language, task, price, rating)
         VALUES (?, ?, ?, ?, ?)`,
      );
      const tx = db.transaction((rows) => {
        rows.forEach((s: any) =>
          insertSkill.run(id, s.language, s.task, s.price, s.rating),
        );
      });
      tx(skills);
    }
  }

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ *
 * DELETE                                                             *
 * ------------------------------------------------------------------ */
export async function DELETE(req: NextRequest) {
  const { id, role, adminPassword } = await req.json();

  const admin = db
    .prepare(`SELECT id FROM admin_users WHERE password = ?`)
    .get(adminPassword);

  if (!admin) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  }

  const table = role === 'manager' ? 'manager_users' : 'member_users';
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ *
 * POST：创建用户（如原逻辑）                                          *
 * ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  const { role, user, skills } = await req.json();
  const table = role === 'manager' ? 'manager_users' : 'member_users';

  const result = db
    .prepare(
      `INSERT INTO ${table}
         (username, password, name, phone, email, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      user.username,
      user.password,
      user.name,
      user.phone,
      user.email,
      user.status || 'active',
    );

  /* 如创建的是接单员且附带技能，追加写入 */
  if (role === 'member' && skills?.length) {
    const memberId    = result.lastInsertRowid;
    const insertSkill = db.prepare(
      `INSERT INTO member_skills
         (member_id, language, task, price, rating)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const tx = db.transaction((rows) => {
      rows.forEach((s: any) =>
        insertSkill.run(memberId, s.language, s.task, s.price, s.rating),
      );
    });
    tx(skills);
  }

  return NextResponse.json({ ok: true });
}
