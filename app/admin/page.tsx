'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

/* ------- 固定选项 ------- */
const LANGS  = ['日语', '英语', '法语', '德语', '俄语'] as const;
const TASKS  = ['翻译', '质检', '后期', '审核'] as const;
const RATINGS = ['A', 'B', 'C', 'D'] as const;

export default function AdminPage() {
  const { data: session, status } = useSession();

  /* ===== 基本状态 ===== */
  const [managers, setManagers] = useState<any[]>([]);
  const [members,  setMembers]  = useState<any[]>([]);
  const [showType, setShowType] = useState<'manager' | 'member'>('manager');
  const [search,   setSearch]   = useState('');

  /* ===== 新增用户状态 ===== */
  const [showAddUser, setShowAddUser] = useState(false);
  const [newRole, setNewRole] = useState<'manager' | 'member'>('manager');
  const [newUser, setNewUser] = useState({
    username: '', password: '', name: '',
    phone: '', email: '', status: 'active',
  });
  const [skills, setSkills] = useState<any[]>([
    { language: '', task: '', price: '', rating: '' },
  ]);

  /* ===== 编辑行状态 ===== */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData,   setEditData] = useState<any>({});

  /* ===== 展开技能状态 ===== */
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [skillMap,   setSkillMap]   = useState<Record<number, any[]>>({});

  /* ---------- 拉取用户列表 ---------- */
  const fetchData = async (name = '') => {
    const res  = await fetch(`/api/admin/users?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    setManagers(data.managers);
    setMembers(data.members);
  };

  /* ---------- 拉取指定接单员的技能 ---------- */
  const fetchSkills = async (memberId: number) => {
    const res  = await fetch(`/api/admin/users?memberId=${memberId}`);
    const data = await res.json();
    setSkillMap((prev) => ({ ...prev, [memberId]: data.skills }));
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') fetchData();
  }, [session]);

  /* ---------- 工具函数 ---------- */
  const clearNewUser = () => {
    setNewUser({
      username: '', password: '', name: '',
      phone: '', email: '', status: 'active',
    });
    setSkills([{ language: '', task: '', price: '', rating: '' }]);
  };

  /* ---------- 用户增删改 ---------- */
  const toggleStatus = async (id: number, role: string, status: string) => {
    await fetch('/api/admin/users', {
      method : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ id, role, status: status === 'active' ? 'frozen' : 'active' }),
    });
    fetchData(search);
  };

  const deleteUser = async (id: number, role: string) => {
    if (!window.confirm('你确定要删除该用户？')) return;
    const pwd = prompt('请输入管理员密码确认删除：');
    if (!pwd) return;

    const res = await fetch('/api/admin/users', {
      method : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ id, role, adminPassword: pwd }),
    });
    if (res.status === 401) alert('密码错误，删除失败');
    else {
      alert('删除成功');
      fetchData(search);
    }
  };

  const submitNewUser = async () => {
    await fetch('/api/admin/users', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        role: newRole,
        user: newUser,
        skills: newRole === 'member' ? skills : [],
      }),
    });
    alert('创建成功');
    fetchData();
    setShowAddUser(false);
    clearNewUser();
  };

  /* ---------- 保存技能修改 ---------- */
  const saveSkills = async (memberId: number) => {
    await fetch('/api/admin/users', {
      method : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        id: memberId,
        role: 'member',
        skills: skillMap[memberId],
      }),
    });
    alert('技能已保存');
  };

  /* ---------- 页面渲染 ---------- */
  if (status === 'loading') return <div>加载中...</div>;
  if (!session || session.user.role !== 'admin') return <div>无访问权限</div>;

  const users = showType === 'manager' ? managers : members;

  return (
    <div className="p-6">
      {/* 顶栏 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          当前登录：<strong>{session.user.name}</strong>（管理员）
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          退出登录
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-4">管理员人员管理</h1>

      {/* 操作按钮组 */}
      <div className="flex gap-4 mb-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => setShowType('manager')}
        >
          项目经理
        </button>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={() => setShowType('member')}
        >
          接单员
        </button>

        <input
          placeholder="搜索姓名"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-2 py-1"
        />
        <button
          onClick={() => fetchData(search)}
          className="bg-gray-600 text-white px-4 py-1 rounded"
        >
          搜索
        </button>

        <button
          onClick={() => setShowAddUser(!showAddUser)}
          className="bg-purple-600 text-white px-4 py-1 rounded"
        >
          {showAddUser ? '取消新增' : '新增用户'}
        </button>
      </div>

      {/* ---------------- 新增用户表单 ---------------- */}
      {showAddUser && (
        <div className="bg-gray-100 border p-4 mb-6">
          <h2 className="text-lg font-bold mb-2">新增用户</h2>

          {/* 角色选择 */}
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as any)}
            className="mb-2 border px-2 py-1"
          >
            <option value="manager">项目经理</option>
            <option value="member">接单员</option>
          </select>

          {/* 基本字段 */}
          {['username', 'password', 'name', 'phone', 'email'].map((f) => (
            <input
              key={f}
              placeholder={f}
              value={newUser[f as keyof typeof newUser]}
              onChange={(e) =>
                setNewUser({ ...newUser, [f]: e.target.value })
              }
              className="block border mb-2 px-2 py-1 w-full"
            />
          ))}

          {/* 只有接单员才填技能 */}
          {newRole === 'member' && (
            <div>
              <h3 className="font-semibold mt-2">技能信息：</h3>
              {skills.map((s, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <select
                    value={s.language}
                    onChange={(e) => {
                      const upd = [...skills];
                      upd[i].language = e.target.value;
                      setSkills(upd);
                    }}
                    className="border px-2"
                  >
                    <option value="">语言</option>
                    {LANGS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>

                  <select
                    value={s.task}
                    onChange={(e) => {
                      const upd = [...skills];
                      upd[i].task = e.target.value;
                      setSkills(upd);
                    }}
                    className="border px-2"
                  >
                    <option value="">任务</option>
                    {TASKS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>

                  <input
                    placeholder="价格"
                    value={s.price}
                    onChange={(e) => {
                      const upd = [...skills];
                      upd[i].price = e.target.value;
                      setSkills(upd);
                    }}
                    className="border px-2 w-20"
                  />

                  <select
                    value={s.rating}
                    onChange={(e) => {
                      const upd = [...skills];
                      upd[i].rating = e.target.value;
                      setSkills(upd);
                    }}
                    className="border px-2"
                  >
                    <option value="">评级</option>
                    {RATINGS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                onClick={() =>
                  setSkills([
                    ...skills,
                    { language: '', task: '', price: '', rating: '' },
                  ])
                }
                className="bg-blue-500 text-white px-2 py-1 rounded"
              >
                添加技能
              </button>
            </div>
          )}

          <button
            onClick={submitNewUser}
            className="bg-green-600 text-white px-4 py-2 mt-4 rounded"
          >
            提交新增
          </button>
        </div>
      )}

      {/* ---------------- 用户列表 ---------------- */}
      <table className="table-auto w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">用户名</th>
            <th className="border px-4 py-2">姓名</th>
            <th className="border px-4 py-2">电话</th>
            <th className="border px-4 py-2">邮箱</th>
            <th className="border px-4 py-2">状态</th>
            <th className="border px-4 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <FragmentRow
              key={u.id}
              user={u}
              showType={showType}
              editingId={editingId}
              editData={editData}
              setEditData={setEditData}
              setEditingId={setEditingId}
              toggleStatus={toggleStatus}
              deleteUser={deleteUser}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              skillMap={skillMap}
              fetchSkills={fetchSkills}
              saveSkills={saveSkills}
              LANGS={LANGS}
              TASKS={TASKS}
              RATINGS={RATINGS}
              setSkillMap={setSkillMap}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 子组件：一行用户 + 可展开技能行                                     */
/* ------------------------------------------------------------------ */
import React from 'react';

function FragmentRow(props: any) {
  const {
    user: u,
    showType,
    editingId,
    editData,
    setEditData,
    setEditingId,
    toggleStatus,
    deleteUser,
    expandedId,
    setExpandedId,
    skillMap,
    fetchSkills,
    saveSkills,
    LANGS,
    TASKS,
    RATINGS,
    setSkillMap,
  } = props;

  return (
    <>
      {/* ---------- 主行 ---------- */}
      <tr key={u.id} className={u.status === 'frozen' ? 'text-gray-400' : ''}>
        {['username', 'name', 'phone', 'email'].map((field) => (
          <td key={field} className="border px-4 py-2">
            {editingId === u.id ? (
              <input
                value={editData[field]}
                onChange={(e) =>
                  setEditData({ ...editData, [field]: e.target.value })
                }
                className="border px-2 py-1 w-full"
              />
            ) : (
              u[field]
            )}
          </td>
        ))}

        <td className="border px-4 py-2">{u.status}</td>
        <td className="border px-4 py-2">
          {editingId === u.id ? (
            <>
              <button
                onClick={async () => {
                  await fetch('/api/admin/users', {
                    method : 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body   : JSON.stringify({
                      id: u.id,
                      role: showType,
                      ...editData,
                    }),
                  });
                  setEditingId(null);
                  window.location.reload();
                }}
                className="bg-green-600 text-white px-2 py-1 mr-1"
              >
                保存
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="bg-gray-400 text-white px-2 py-1"
              >
                取消
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditingId(u.id);
                  setEditData({
                    username: u.username,
                    name: u.name,
                    phone: u.phone,
                    email: u.email,
                  });
                }}
                className="bg-blue-500 text-white px-2 py-1 mr-1 rounded"
              >
                编辑
              </button>

              <button
                className="bg-yellow-500 text-white px-2 py-1 mr-1 rounded"
                onClick={() => toggleStatus(u.id, showType, u.status)}
              >
                切换状态
              </button>

              <button
                className="bg-red-500 text-white px-2 py-1 mr-1 rounded"
                onClick={() => deleteUser(u.id, showType)}
              >
                删除
              </button>

              {showType === 'member' && (
                <button
                  className="bg-purple-600 text-white px-2 py-1 rounded"
                  onClick={async () => {
                    if (expandedId === u.id) {
                      setExpandedId(null);
                      return;
                    }
                    setExpandedId(u.id);
                    if (!skillMap[u.id]) await fetchSkills(u.id);
                  }}
                >
                  {expandedId === u.id ? '收起' : '展开'}
                </button>
              )}
            </>
          )}
        </td>
      </tr>

      {/* ---------- 展开行（仅接单员） ---------- */}
      {showType === 'member' && expandedId === u.id && (
        <tr>
          <td colSpan={6} className="border px-4 py-2 bg-gray-50">
            <h4 className="font-bold mb-2">技能列表</h4>

            {(skillMap[u.id] || []).map((s: any, idx: number) => (
              <div key={idx} className="flex gap-2 mb-1 items-center">
                {/* 语言 */}
                <select
                  value={s.language}
                  onChange={(e) => {
                    const copy = [...skillMap[u.id]];
                    copy[idx].language = e.target.value;
                    setSkillMap((prev) => ({ ...prev, [u.id]: copy }));
                  }}
                  className="border px-2"
                >
                  {LANGS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>

                {/* 任务 */}
                <select
                  value={s.task}
                  onChange={(e) => {
                    const copy = [...skillMap[u.id]];
                    copy[idx].task = e.target.value;
                    setSkillMap((prev) => ({ ...prev, [u.id]: copy }));
                  }}
                  className="border px-2"
                >
                  {TASKS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>

                {/* 价格 */}
                <input
                  value={s.price}
                  onChange={(e) => {
                    const copy = [...skillMap[u.id]];
                    copy[idx].price = e.target.value;
                    setSkillMap((prev) => ({ ...prev, [u.id]: copy }));
                  }}
                  className="border px-2 w-20"
                />

                {/* 评级 */}
                <select
                  value={s.rating}
                  onChange={(e) => {
                    const copy = [...skillMap[u.id]];
                    copy[idx].rating = e.target.value;
                    setSkillMap((prev) => ({ ...prev, [u.id]: copy }));
                  }}
                  className="border px-2"
                >
                  {RATINGS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>

                {/* 删除按钮 */}
                <button
                  onClick={() => {
                    if (!window.confirm('确定删除该技能？')) return;
                    const copy = [...skillMap[u.id]];
                    copy.splice(idx, 1);          // 移除当前行
                    setSkillMap((prev) => ({ ...prev, [u.id]: copy }));
                  }}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  删除
                </button>
              </div>
            ))}

            {/* 添加技能行 */}
            <button
              onClick={() =>
                setSkillMap((prev) => ({
                  ...prev,
                  [u.id]: [
                    ...(prev[u.id] || []),
                    { language: LANGS[0], task: TASKS[0], price: '', rating: 'A' },
                  ],
                }))
              }
              className="bg-blue-500 text-white px-2 py-1 mt-2 mr-2 rounded"
            >
              添加技能
            </button>

            {/* 保存技能按钮 */}
            <button
              onClick={() => saveSkills(u.id)}
              className="bg-green-600 text-white px-2 py-1 mt-2 rounded"
            >
              保存技能
            </button>
          </td>
        </tr>
      )}
    </>
  );
}
