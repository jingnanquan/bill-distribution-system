-- 管理员表
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    status TEXT
);

-- 项目经理表
CREATE TABLE IF NOT EXISTS manager_users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    status TEXT
);

-- 接单员表
CREATE TABLE IF NOT EXISTS member_users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    status TEXT
);

-- 接单员技能表
CREATE TABLE IF NOT EXISTS member_skills (
    id INTEGER PRIMARY KEY,
    member_id INTEGER,
    language TEXT,
    task TEXT,
    price REAL,
    rating TEXT,
    FOREIGN KEY (member_id) REFERENCES member_users(id)
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    title TEXT,
    episode TEXT,
    language TEXT,
    minutes INTEGER,
    deadline DATE,
    manager_id INTEGER,
    accepted INTEGER DEFAULT 0,         -- 0=未验收，1=已验收
    FOREIGN KEY (manager_id) REFERENCES manager_users(id)
);

-- 项目分配表
CREATE TABLE IF NOT EXISTS project_assignments (
    id INTEGER PRIMARY KEY,
    project_id INTEGER,
    member_id INTEGER,
    role TEXT,
    minutes INTEGER,
    status TEXT,            -- pending / accepted / rejected / completed
    deadline DATE,
    completed_time DATETIME,
    deduction_note TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (member_id) REFERENCES member_users(id)
);

-- 月账单表
CREATE TABLE IF NOT EXISTS monthly_reports (
    id INTEGER PRIMARY KEY,
    member_id INTEGER,
    project_id INTEGER,
    time DATE,
    role TEXT,
    price REAL,
    minutes INTEGER,
    amount REAL,
    FOREIGN KEY (member_id) REFERENCES member_users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
