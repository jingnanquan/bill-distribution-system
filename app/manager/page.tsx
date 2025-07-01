'use client';
import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

const TASKS = ['翻译', '质检', '后期', '审核'] as const;
type TaskName = (typeof TASKS)[number];
const today = new Date().toISOString().split('T')[0];

/* -------------------------------------------------- */
/* 颜色映射                                            */
/* -------------------------------------------------- */
const statusColor = (s: string) => {
  switch (s) {
    case '请重新分配任务':
    case '超时未完成':
      return 'text-red-600';
    case '待验收':
      return 'text-green-600';
    case '分配中':
      return 'text-blue-600';
    case '进行中':
      return 'text-yellow-600';
    default:
      return '';
  }
};

export default function ManagerPage() {
  const { data: session, status } = useSession();

  /* ---------------- 状态 ---------------- */
  const [projects, setProjects] = useState<any[]>([]);
  const [members,  setMembers]  = useState<any[]>([]);
  const [err,      setErr]      = useState(false);
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  /* ---- 新建项目 ---- */
  const [formVisible, setFormVisible] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    episode: '',
    language: '日语',
    minutes: 0,
    deadline: today,
    assignments: TASKS.reduce(
      (acc, t) => ({ ...acc, [t]: '' }),
      {} as Record<TaskName, string>
    ),
  });
  const [assignTexts, setAssignTexts] = useState<Record<TaskName, string>>({
    翻译: '', 质检: '', 后期: '', 审核: '',
  });
  const [eligible, setEligible] = useState<Record<TaskName, any[]>>({
    翻译: [], 质检: [], 后期: [], 审核: [],
  });

  /* ---------------- fetch helpers ---------------- */
  const fetchMembers = async () => {
    const res  = await fetch(`/api/admin/users?name=${encodeURIComponent(search)}`);
    const data = await res.json();
    setMembers(data.members);
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/manager/projects');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
      setErr(false);
    } catch {
      setProjects([]);
      setErr(true);
    }
  };

  async function searchEligible(task: TaskName, keyword = '') {
    const url =
      `/api/manager/projects?language=${encodeURIComponent(newProject.language)}` +
      `&task=${encodeURIComponent(task)}&keyword=${encodeURIComponent(keyword)}`;
    const res  = await fetch(url);
    const data = await res.json();
    setEligible(prev => ({ ...prev, [task]: data.members ?? [] }));
  }

  /* ---------------- 首次加载 ---------------- */
  useEffect(() => {
    if (session?.user?.role === 'manager') {
      fetchMembers();
      fetchProjects();
      TASKS.forEach(t => searchEligible(t));
    }
  }, [session]);

  useEffect(() => {
    TASKS.forEach(t => searchEligible(t));
  }, [newProject.language]);

  /* ---------------- 新建项目提交 ---------------- */
  const handleCreateProject = async () => {
    try {
      const res = await fetch('/api/manager/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      if (!res.ok) throw new Error();
      setFormVisible(false);
      setNewProject({
        title: '',
        episode: '',
        language: '日语',
        minutes: 0,
        deadline: today,
        assignments: TASKS.reduce(
          (acc, t) => ({ ...acc, [t]: '' }),
          {} as Record<TaskName, string>
        ),
      });
      fetchProjects();
    } catch {
      alert('创建失败，请检查字段！');
    }
  };

  /* ---------------- 项目验收 ---------------- */
  const handleAcceptProject = async (id: number) => {
    const ok = confirm('确认项目所有任务正确完成并验收？');
    if (!ok) return;
    const res = await fetch('/api/manager/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id }),
    });
    if (res.ok) {
      fetchProjects();
    } else {
      alert('验收失败！');
    }
  };

  /* ---------------- 视图数据分组 ---------------- */
  const pendingProjects   = projects.filter(p => p.accepted === 0);
  const completedProjects = projects.filter(p => p.accepted === 1);

  /* ---------------- UI ---------------- */
  if (status === 'loading') return <div>加载中...</div>;
  if (!session || session.user.role !== 'manager') return <div>无访问权限</div>;

  return (
    <div className="p-6">
      {/* 顶部栏 --------------------------------------------------------- */}
      <div className="flex justify-between items-center mb-6">
        <div>
          当前登录：<strong>{session.user.name}</strong>（项目经理）
        </div>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          退出登录
        </button>
      </div>

      {/* ===== 接单员管理 ===== */}
      <h2 className="text-xl font-bold mb-2">接单员管理</h2>
      <div className="flex gap-2 mb-4">
        <input
          placeholder="搜索姓名"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border px-2 py-1"
        />
        <button
          className="bg-gray-600 text-white px-4 py-1 rounded"
          onClick={fetchMembers}
        >
          搜索
        </button>
      </div>

      <table className="table-auto w-full border-collapse border mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2">用户名</th>
            <th className="border px-2">姓名</th>
            <th className="border px-2">状态</th>
            <th className="border px-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id} className={m.status === 'frozen' ? 'text-gray-400' : ''}>
              <td className="border px-2">{m.username}</td>
              <td className="border px-2">{m.name}</td>
              <td className="border px-2">{m.status}</td>
              <td className="border px-2">
                <button
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                  onClick={() => toggleStatus(m.id, m.status)}
                >
                  切换状态
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== 待完成的项目 ===== */}
      <h2 className="text-xl font-bold mb-2">待完成的项目</h2>
      {err ? (
        <div className="text-red-600 mb-4">⚠️ 加载项目失败，可能无权限或服务器异常</div>
      ) : pendingProjects.length === 0 ? (
        <div className="text-gray-500 mb-8">暂无待完成项目</div>
      ) : (
        <table className="table-auto w-full border-collapse border mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2">名称</th>
              <th className="border px-2">集数</th>
              <th className="border px-2">语言</th>
              <th className="border px-2">分钟数</th>
              <th className="border px-2">截止日期</th>
              <th className="border px-2">状态</th>
              <th className="border px-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {pendingProjects.map(p => (
              <React.Fragment key={p.id}>
                <tr>
                  <td className="border px-2">{p.title}</td>
                  <td className="border px-2">{p.episode}</td>
                  <td className="border px-2">{p.language}</td>
                  <td className="border px-2">{p.minutes}</td>
                  <td className="border px-2">{p.deadline}</td>
                  <td className="border px-2 font-semibold">
                    <span className={statusColor(p.projectStatus)}>
                      {p.projectStatus}
                    </span>
                  </td>
                  <td className="border px-2">
                    <button
                      className="bg-blue-500 text-white px-2 py-1 rounded"
                      onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    >
                      {expanded === p.id ? '收起' : '展开'}
                    </button>
                    {p.projectStatus === '待验收' && (
                      <button
                        className="bg-green-600 text-white px-2 py-1 rounded ml-2"
                        onClick={() => handleAcceptProject(p.id)}
                      >
                        验收
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === p.id && (
                  <tr>
                    <td colSpan={7} className="border px-2 bg-gray-50">
                      {p.assignments.map((a: any) => (
                        <div key={a.id} className="text-sm mb-1">
                          <strong>{a.role}</strong>：{a.member_name}，
                          状态 {a.status}，
                          完成时间 {a.completed_time || '未完成'}
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* ===== 已完成的项目 ===== */}
      <h2 className="text-xl font-bold mb-2">已完成的项目</h2>
      {completedProjects.length === 0 ? (
        <div className="text-gray-500 mb-8">暂无已完成项目</div>
      ) : (
        <table className="table-auto w-full border-collapse border mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2">名称</th>
              <th className="border px-2">集数</th>
              <th className="border px-2">语言</th>
              <th className="border px-2">分钟数</th>
              <th className="border px-2">截止日期</th>
              <th className="border px-2">验收时间</th>
              <th className="border px-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {completedProjects.map(p => (
              <React.Fragment key={p.id}>
                <tr>
                  <td className="border px-2">{p.title}</td>
                  <td className="border px-2">{p.episode}</td>
                  <td className="border px-2">{p.language}</td>
                  <td className="border px-2">{p.minutes}</td>
                  <td className="border px-2">{p.deadline}</td>
                  <td className="border px-2">
                    {/* 简化：用 accepted=1 的当天日期代替真正验收时间 */}
                    {new Date(p.accepted_time || Date.now())
                      .toISOString()
                      .split('T')[0]}
                  </td>
                  <td className="border px-2">
                    <button
                      className="bg-blue-500 text-white px-2 py-1 rounded"
                      onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    >
                      {expanded === p.id ? '收起' : '展开'}
                    </button>
                  </td>
                </tr>
                {expanded === p.id && (
                  <tr>
                    <td colSpan={7} className="border px-2 bg-gray-50">
                      {p.assignments.map((a: any) => (
                        <div key={a.id} className="text-sm mb-1">
                          <strong>{a.role}</strong>：{a.member_name}，
                          状态 {a.status}，
                          完成时间 {a.completed_time || '未完成'}
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* ===== 新建项目 ===== */}
      <div className="flex items-center mb-2">
        <h2 className="text-xl font-bold mr-4">新建项目</h2>
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded"
          onClick={() => setFormVisible(v => !v)}
        >
          {formVisible ? '收起' : '展开'}
        </button>
      </div>

      {formVisible && (
        <>
          {/* 基本信息 ----------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder="项目名称"
              value={newProject.title}
              className="border px-2 py-1"
              onChange={e => setNewProject({ ...newProject, title: e.target.value })}
            />
            <input
              placeholder="集数"
              value={newProject.episode}
              className="border px-2 py-1"
              onChange={e => setNewProject({ ...newProject, episode: e.target.value })}
            />
            <select
              className="border px-2 py-1"
              value={newProject.language}
              onChange={e => setNewProject({ ...newProject, language: e.target.value })}
            >
              <option value="日语">日语</option>
              <option value="英语">英语</option>
              <option value="韩语">韩语</option>
            </select>
            <input
              type="number"
              placeholder="分钟数"
              value={newProject.minutes || ''}
              className="border px-2 py-1"
              onChange={e =>
                setNewProject({ ...newProject, minutes: Number(e.target.value) })
              }
            />
            <input
              type="date"
              value={newProject.deadline}
              className="border px-2 py-1"
              onChange={e =>
                setNewProject({ ...newProject, deadline: e.target.value })
              }
            />
          </div>

          {/* 任务分配 ----------------------------------------------------- */}
          <h3 className="font-bold">任务分配</h3>
          {TASKS.map(task => (
            <div key={task} className="mb-2 flex items-center">
              <span className="w-16">{task}：</span>
              <input
                list={`${task}-list`}
                className="border px-2 py-1 flex-1"
                placeholder="输入姓名或用户名"
                value={assignTexts[task]}
                onChange={async e => {
                  const text = e.target.value;
                  setAssignTexts({ ...assignTexts, [task]: text });
                  await searchEligible(task, text);
                  const hit = eligible[task].find(
                    (m) =>
                      text === `${m.name}（${m.username}）` ||
                      text === m.username ||
                      text === m.name,
                  );
                  setNewProject(p => ({
                    ...p,
                    assignments: { ...p.assignments, [task]: hit ? String(hit.id) : '' },
                  }));
                }}
                onBlur={e => {
                  const text = e.target.value.trim();
                  if (newProject.assignments[task]) {
                    setAssignTexts(prev => ({ ...prev, [task]: text }));
                    return;
                  }
                  const hit = eligible[task].find(
                    (m) =>
                      text === `${m.name}（${m.username}）` ||
                      text === m.username ||
                      text === m.name,
                  );
                  if (hit) {
                    setAssignTexts(prev => ({ ...prev, [task]: text }));
                    setNewProject(p => ({
                      ...p,
                      assignments: { ...p.assignments, [task]: String(hit.id) },
                    }));
                  } else {
                    setAssignTexts(prev => ({ ...prev, [task]: '' }));
                    setNewProject(p => ({
                      ...p,
                      assignments: { ...p.assignments, [task]: '' },
                    }));
                  }
                }}
              />
              <datalist id={`${task}-list`}>
                {eligible[task].map(m => (
                  <option key={m.id} value={`${m.name}（${m.username}）`} />
                ))}
              </datalist>
            </div>
          ))}

          <button
            className="bg-green-600 text-white px-4 py-2 mt-4"
            onClick={handleCreateProject}
          >
            创建项目
          </button>
        </>
      )}
    </div>
  );
}
