// scripts/seed-users.js
const Database = require('better-sqlite3');
const path = require('path');

// 定位数据库文件
const dbPath = path.join(__dirname, '../data/bill_system.db');
const db = new Database(dbPath);

// 启用外键约束和详细错误报告
db.pragma('foreign_keys = ON');
db.pragma('verbose = ON');

try {
  // 清空旧数据（按依赖顺序删除）
  console.log('开始清空旧数据...');
  const clearDatabase = db.transaction(() => {
    db.prepare('DELETE FROM monthly_reports').run();
    db.prepare('DELETE FROM project_assignments').run();
    db.prepare('DELETE FROM projects').run();
    db.prepare('DELETE FROM member_skills').run();
    db.prepare('DELETE FROM admin_users').run();
    db.prepare('DELETE FROM manager_users').run();
    db.prepare('DELETE FROM member_users').run();
  });
  clearDatabase();
  console.log('✅ 旧数据清除完成');

  // 插入用户数据
  console.log('开始插入用户数据...');
  const insertUsers = db.transaction(() => {
    // 插入管理员
    const adminResult = db.prepare(`
      INSERT INTO admin_users (id, username, password, name, phone, email, status)
      VALUES (1, 'admin', 'admin123', '管理员', '1111111111', 'admin@example.com', 'active')
    `).run();
    console.log(`插入管理员，影响行数: ${adminResult.changes}`);

    // 插入项目经理
    const managerResult = db.prepare(`
      INSERT INTO manager_users (id, username, password, name, phone, email, status)
      VALUES (1, 'manager', 'manager123', '项目经理', '2222222222', 'manager@example.com', 'active')
    `).run();
    console.log(`插入项目经理，影响行数: ${managerResult.changes}`);

    // 插入接单员
    const memberResult = db.prepare(`
      INSERT INTO member_users (id, username, password, name, phone, email, status)
      VALUES (1, 'member', 'member123', '接单员', '3333333333', 'member@example.com', 'active')
    `).run();
    console.log(`插入接单员，影响行数: ${memberResult.changes}`);
  });
  insertUsers();
  console.log('✅ 用户数据插入完成');

  // 插入接单员技能
  console.log('开始插入技能数据...');
  const skillInsert = db.prepare(`
    INSERT INTO member_skills (member_id, language, task, price, rating)
    VALUES (?, ?, ?, ?, ?)
  `);

  const skills = [
    [1, '日语', '翻译', 0.8, 'A'],
    [1, '日语', '质检', 0.9, 'B'],
    [1, '英语', '后期', 1.0, 'C'],
    [1, '日语', '审核', 1.1, 'B']
  ];

  const insertSkills = db.transaction((skills) => {
    let totalSkills = 0;
    for (const skill of skills) {
      const result = skillInsert.run(skill);
      totalSkills += result.changes;
    }
    return totalSkills;
  });

  const insertedSkills = insertSkills(skills);
  console.log(`✅ 技能数据插入完成，共插入 ${insertedSkills} 条技能`);

  // 验证数据插入
  console.log('\n验证数据完整性...');
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM member_users').get();
  const skillCount = db.prepare('SELECT COUNT(*) as count FROM member_skills').get();

  console.log(`接单员数量: ${memberCount.count} (应为 1)`);
  console.log(`技能数量: ${skillCount.count} (应为 4)`);

  if (memberCount.count !== 1 || skillCount.count !== 4) {
    throw new Error('数据验证失败！');
  }

  console.log('\n✅ 所有数据验证通过');
} catch (error) {
  console.error('❌ 执行过程中出错:', error.message);
} finally {
  // 关闭数据库连接
  db.close();
}