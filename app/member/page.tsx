'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function MemberPage() {
  const { data: session, status } = useSession();
  const [pending, setPending] = useState<any[]>([]);
  const [accepted, setAccepted] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [loadError, setLoadError] = useState(false);

  const fetchAssignments = async (month: string) => {
    try {
      const url = month ? `/api/member/assignments?month=${month}` : '/api/member/assignments';
      const res = await fetch(url);
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data = await res.json();
      setPending(data.pending);
      setAccepted(data.accepted);
      setCompleted(data.completed);
      setSkills(data.skills);
      setAvailableMonths(data.availableMonths);

      if (!month && data.availableMonths.length > 0) {
        setSelectedMonth(data.availableMonths[0]);
      }

      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'member') {
      fetchAssignments(selectedMonth);
    }
  }, [session, selectedMonth]);

  const updateAssignment = async (id: number, action: string, confirmText: string) => {
    const ok = confirm(confirmText);
    if (!ok) return;
    const res = await fetch('/api/member/assignments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: id, action }),
    });
    if (res.ok) fetchAssignments(selectedMonth);
    else alert('操作失败，请稍后再试');
  };

  if (status === 'loading') return <div>加载中...</div>;
  if (!session || session.user.role !== 'member') return <div>无访问权限</div>;

  return (
    <div className="p-6 space-y-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          当前登录：<strong>{session.user.name}</strong>（接单员）
        </div>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          退出登录
        </button>
      </div>

      {loadError && (
        <div className="text-red-600 mb-4">⚠️ 加载任务失败，请稍后刷新页面</div>
      )}

      {/* 技能信息 */}
      <div>
        <h2 className="text-xl font-bold mb-2">个人技能</h2>
        {skills.length === 0 ? (
          <p className="text-gray-500">尚未填写技能信息</p>
        ) : (
          <table className="table-auto w-full border-collapse border mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2">语言</th>
                <th className="border px-2">任务类型</th>
                <th className="border px-2">单价</th>
                <th className="border px-2">评级</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s, idx) => (
                <tr key={idx}>
                  <td className="border px-2">{s.language}</td>
                  <td className="border px-2">{s.task}</td>
                  <td className="border px-2">{s.price}</td>
                  <td className="border px-2">{s.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 待接受任务 */}
      <div>
        <h2 className="text-xl font-bold mb-2">待接受的任务</h2>
        {pending.length === 0 ? (
          <p className="mb-6 text-gray-500">暂无待接受任务</p>
        ) : (
          <table className="table-auto w-full border-collapse border mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2">项目名</th>
                <th className="border px-2">语言</th>
                <th className="border px-2">分钟数</th>
                <th className="border px-2">截止日期</th>
                <th className="border px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id}>
                  <td className="border px-2">{a.title}</td>
                  <td className="border px-2">{a.language}</td>
                  <td className="border px-2">{a.project_minutes}</td>
                  <td className="border px-2">{a.deadline}</td>
                  <td className="border px-2 space-x-2">
                    <button
                      className="bg-green-600 text-white px-2 py-1 rounded"
                      onClick={() => updateAssignment(a.id, 'accept', '确认接受该任务？')}
                    >
                      接受
                    </button>
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => updateAssignment(a.id, 'reject', '确认拒绝该任务？')}
                    >
                      拒绝
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 已接受任务 */}
      <div>
        <h2 className="text-xl font-bold mb-2">进行中的任务</h2>
        {accepted.length === 0 ? (
          <p className="text-gray-500">暂无进行中的任务</p>
        ) : (
          <table className="table-auto w-full border-collapse border mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2">项目名</th>
                <th className="border px-2">语言</th>
                <th className="border px-2">分钟数</th>
                <th className="border px-2">截止日期</th>
                <th className="border px-2">状态</th>
                <th className="border px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {accepted.map((a) => (
                <tr key={a.id}>
                  <td className="border px-2">{a.title}</td>
                  <td className="border px-2">{a.language}</td>
                  <td className="border px-2">{a.project_minutes}</td>
                  <td className="border px-2">{a.deadline}</td>
                  <td className="border px-2">{a.status}</td>
                  <td className="border px-2">
                    <button
                      className="bg-blue-600 text-white px-2 py-1 rounded"
                      onClick={() => updateAssignment(a.id, 'complete', '确认已完成该任务？')}
                    >
                      确认完成
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 已完成任务 */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-xl font-bold">已完成的任务</h2>
          {availableMonths.length > 0 && (
            <select
              className="border px-2 py-1 rounded"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
        {availableMonths.length === 0 ? (
          <p className="text-gray-500">暂无已完成任务</p>
        ) : completed.length === 0 ? (
          <p className="text-gray-500">该月无已完成任务</p>
        ) : (
          <table className="table-auto w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2">项目名</th>
                <th className="border px-2">语言</th>
                <th className="border px-2">分钟数</th>
                <th className="border px-2">完成时间</th>
                <th className="border px-2">备注</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((a) => (
                <tr key={a.id}>
                  <td className="border px-2">{a.title}</td>
                  <td className="border px-2">{a.language}</td>
                  <td className="border px-2">{a.project_minutes}</td>
                  <td className="border px-2">{a.completed_time}</td>
                  <td className="border px-2">{a.deduction_note || '无'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
