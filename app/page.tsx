"use client";
import { useState, useEffect, useRef } from "react";

// ────────────────────────────────────────────────────────────
//  静态数据
// ────────────────────────────────────────────────────────────
const GROUPS = [
  { id: 1, name: "计算机网络课程群", type: "课程", avatar: "计", count: 247, dot: true },
  { id: 2, name: "摄影社成员群", type: "社团", avatar: "摄", count: 89, dot: false },
  { id: 3, name: "产品赛队伍", type: "竞赛", avatar: "赛", count: 12, dot: true },
  { id: 4, name: "班级生活群", type: "班级", avatar: "班", count: 156, dot: false },
  { id: 5, name: "小 A 的密友群", type: "日常", avatar: "友", count: 5, dot: true },
];

const TYPE_COLOR = {
  课程: "#4A90D9",
  社团: "#7B68EE",
  竞赛: "#FF6B6B",
  班级: "#52C41A",
  日常: "#FFB347",
};

const INITIAL_MESSAGES = {
  1: [
    { id: 1, sender: "王同学", content: "老师今天讲的 TCP 三次握手我没听懂", time: "18:42", self: false },
    { id: 2, sender: "你", content: "我发你笔记", time: "18:43", self: true },
    { id: 3, sender: "张老师", content: "同学们注意，本周五（5月9日）23:59前提交第三章课后作业，word格式，不少于3000字，发到课程邮箱", time: "22:03", self: false },
    { id: 4, sender: "李同学", content: "收到！", time: "22:04", self: false },
    { id: 5, sender: "陈同学", content: "好的老师", time: "22:05", self: false },
  ],
  2: [
    { id: 1, sender: "社长小明", content: "周六外拍活动改到下午3点，地点不变还是玄武湖", time: "15:20", self: false },
    { id: 2, sender: "你", content: "收到！我会准时到的", time: "15:22", self: true },
    { id: 3, sender: "社长小明", content: "对了，周六外拍地点也改了，改到情人谷，人少一点风景好", time: "19:45", self: false },
  ],
  3: [
    { id: 1, sender: "队友小张", content: "方案PPT谁来做？", time: "14:00", self: false },
    { id: 2, sender: "你", content: "我来，明天下午给你们", time: "14:05", self: true },
    { id: 3, sender: "队友小李", content: "提醒一下，初赛提交截止是5月6日，现在还剩不到6小时", time: "18:01", self: false },
  ],
  4: [
    { id: 1, sender: "班长", content: "通知：计算机网络期末考试从7月10日改到7月11日上午10点，地点教三204不变", time: "20:15", self: false },
    { id: 2, sender: "你", content: "谢谢班长！", time: "20:16", self: true },
  ],
  5: [
    { id: 1, sender: "小美", content: "周末出游定了吗？我周六下午有空", time: "11:30", self: false },
    { id: 2, sender: "小红", content: "我周六上午有课，下午可以", time: "11:32", self: false },
    { id: 3, sender: "你", content: "那就周六下午？去哪？", time: "11:33", self: true },
    { id: 4, sender: "小美", content: "玄武湖或者中山陵都行", time: "11:35", self: false },
    { id: 5, sender: "小红", content: "中山陵吧，没去过", time: "11:36", self: false },
    { id: 6, sender: "你", content: "好，就中山陵，下午2点地铁站集合？", time: "11:37", self: true },
    { id: 7, sender: "小美", content: "行！", time: "11:38", self: false },
    { id: 8, sender: "小红", content: "👍", time: "11:38", self: false },
  ],
};

// ────────────────────────────────────────────────────────────
//  胶囊颜色系统
// ────────────────────────────────────────────────────────────
const CAPSULE_STYLES = {
  pending:   { bg: "#FFFBE6", border: "#FFD666", badge: "#FA8C16", label: "待确认", dot: "#FA8C16" },
  confirmed: { bg: "#F6FFED", border: "#95DE64", badge: "#52C41A", label: "已确认", dot: "#52C41A" },
  conflict:  { bg: "#FFF1F0", border: "#FFA39E", badge: "#FF4D4F", label: "时间冲突", dot: "#FF4D4F" },
  plan:      { bg: "#EFF6FF", border: "#93C5FD", badge: "#3B82F6", label: "方案胶囊", dot: "#3B82F6" },
  sensitive: { bg: "#F5F5F5", border: "#D9D9D9", badge: "#8C8C8C", label: "敏感信息", dot: "#8C8C8C" },
};

const INITIAL_CAPSULES = [
  {
    id: 1, type: "pending", group: "计算机网络课程群",
    title: "📎 课后作业 DDL",
    content: "第三章课后作业，5月9日 23:59 前提交，word格式，不少于3000字",
    time: "22:03", from: "张老师",
    new: true,
  },
  {
    id: 2, type: "conflict", group: "班级生活群 × 摄影社",
    title: "⚠️ 时间冲突检测",
    content: "计网期末考试（7月11日 10:00 教三204）与摄影社外拍时间重叠，考试不可缺席，建议告知社团请假",
    time: "20:16", from: "AI 检测",
    new: true,
  },
  {
    id: 3, type: "plan", group: "小 A 的密友群",
    title: "🗺️ 周末出游方案",
    content: "✅ 已确定：周六下午，中山陵，地铁站下午2点集合\n⚠️ 未确定：交通费 AA 还是请客？午饭怎么安排？",
    time: "11:38", from: "AI 总结",
    new: false,
  },
];

// ────────────────────────────────────────────────────────────
//  风格文案
// ────────────────────────────────────────────────────────────
const REMINDER_STYLES = [
  { label: "温柔学姐风", icon: "🌸", text: "亲爱的，产品赛截止还有6小时哦～记得检查一下材料，加油！" },
  { label: "毒舌室友风", icon: "😤", text: "别睡了！产品赛还剩6小时，再不交直接退赛算了，哈哈开玩笑的，快写！" },
  { label: "佛系朋友风", icon: "🧘", text: "嗯……产品赛好像快截止了。交不交都行吧，不过……还是交一下？" },
  { label: "正经班委风", icon: "📋", text: "提醒：产品创意大赛初赛作品提交截止时间为今日24:00，请务必在规定时间内完成提交。" },
];

// ════════════════════════════════════════════════════════════
//  主组件
// ════════════════════════════════════════════════════════════
export default function QCapsuleDemo() {
  const [activeGroup, setActiveGroup] = useState(1);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [capsules, setCapsules] = useState(INITIAL_CAPSULES);
  const [newCapsuleIds, setNewCapsuleIds] = useState([1, 2]);
  const [dailyReport, setDailyReport] = useState(false);
  const [reminderModal, setReminderModal] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [sentReminder, setSentReminder] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [flyingCapsule, setFlyingCapsule] = useState(null);
  const [toast, setToast] = useState(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(3);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeGroup]);

  const showToast = (msg, color = "#52C41A") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  // ── 触发 DDL 场景 ──
  const simulateDDL = () => {
    const newMsg = {
      id: Date.now(), sender: "张老师",
      content: "补充提醒：作业请同时提交到学习通平台，截止时间5月9日23:59，不接受补交！",
      time: "22:05", self: false,
    };
    setMessages(prev => ({ ...prev, 1: [...prev[1], newMsg] }));
    setActiveGroup(1);
    setTimeout(() => {
      const cap = {
        id: Date.now(), type: "pending", group: "计算机网络课程群",
        title: "📎 作业补充要求",
        content: "需同时提交到学习通平台，5月9日23:59截止，不接受补交",
        time: "22:05", from: "张老师", new: true,
      };
      setCapsules(prev => [cap, ...prev]);
      setNewCapsuleIds(prev => [cap.id, ...prev]);
      setFlyingCapsule(cap.id);
      setUnreadCount(c => c + 1);
      setTimeout(() => setFlyingCapsule(null), 800);
      showToast("🟡 新胶囊已捕获，飞入右栏");
    }, 600);
  };

  // ── 触发调课冲突场景 ──
  const simulateConflict = () => {
    const newMsg = {
      id: Date.now(), sender: "班长",
      content: "再次确认：7月11日上午10点计网考试，摄影社当天外拍建议告假",
      time: "20:20", self: false,
    };
    setMessages(prev => ({ ...prev, 4: [...prev[4], newMsg] }));
    setActiveGroup(4);
    setTimeout(() => {
      const cap = {
        id: Date.now(), type: "conflict", group: "班级生活群",
        title: "🚨 考试与外拍冲突",
        content: "7月11日同时存在：计网期末考试（10:00 教三204）+ 摄影社外拍。考试必须出席，建议立即通知社长请假。",
        time: "20:20", from: "AI 冲突检测", new: true,
      };
      setCapsules(prev => [cap, ...prev]);
      setNewCapsuleIds(prev => [cap.id, ...prev]);
      setFlyingCapsule(cap.id);
      setUnreadCount(c => c + 1);
      setTimeout(() => setFlyingCapsule(null), 800);
      showToast("🔴 冲突检测！已生成红色胶囊", "#FF4D4F");
    }, 600);
  };

  // ── 触发22:00日报 ──
  const showDailyReport = () => {
    setDailyReport(true);
  };

  // ── 触发群体排期场景 ──
  const simulateSchedule = () => {
    const newMsg = {
      id: Date.now(), sender: "你",
      content: "@Q仔 帮我们约个周末出游，2小时左右",
      time: "12:00", self: true,
    };
    setMessages(prev => ({ ...prev, 5: [...prev[5], newMsg] }));
    setActiveGroup(5);
    setTimeout(() => {
      const qMsg = {
        id: Date.now() + 1, sender: "Q仔", isAI: true,
        content: "好的！我已询问群内成员参与意愿，基于大家已授权的日程（仅显示交集，不展示个人安排），为你们找到 3 个共同空闲时段：\n\n① 本周六 14:00–16:00\n② 本周日 10:00–12:00\n③ 下周六 15:00–17:00\n\n任一人点击确认即可写入所有人日程 👇",
        time: "12:00", self: false,
      };
      setMessages(prev => ({ ...prev, 5: [...prev[5], newMsg, qMsg] }));
      setScheduleModal(true);
    }, 800);
  };

  // ── 确认胶囊 ──
  const confirmCapsule = (id) => {
    setCapsules(prev => prev.map(c => c.id === id ? { ...c, type: "confirmed", new: false } : c));
    setNewCapsuleIds(prev => prev.filter(i => i !== id));
    setUnreadCount(c => Math.max(0, c - 1));
    showToast("✅ 胶囊已确认，加入日程");
  };

  // ── 忽略胶囊 ──
  const dismissCapsule = (id) => {
    setCapsules(prev => prev.filter(c => c.id !== id));
    setNewCapsuleIds(prev => prev.filter(i => i !== id));
    setUnreadCount(c => Math.max(0, c - 1));
    showToast("已忽略该胶囊", "#8C8C8C");
  };

  const currentGroup = GROUPS.find(g => g.id === activeGroup);
  const pendingCount = capsules.filter(c => c.type === "pending" || c.type === "conflict").length;

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      background: "#1a1a2e", fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
      overflow: "hidden", position: "relative",
    }}>

      {/* ── Toast 提示 ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.color, color: "#fff", padding: "10px 22px",
          borderRadius: 24, fontSize: 13, fontWeight: 600, zIndex: 9999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          animation: "fadeInDown 0.3s ease",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          左栏 · 群列表
      ══════════════════════════════════════════════════════ */}
      <div style={{
        width: 220, background: "#16213e", borderRight: "1px solid #0f3460",
        display: "flex", flexDirection: "column",
      }}>
        {/* 顶部头像区 */}
        <div style={{
          padding: "18px 16px 14px", borderBottom: "1px solid #0f3460",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #4A90D9, #7B68EE)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff",
          }}>小A</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8e8" }}>小 A</div>
            <div style={{ fontSize: 11, color: "#666" }}>在线</div>
          </div>
        </div>

        {/* 群列表标题 */}
        <div style={{ padding: "12px 16px 8px", fontSize: 11, color: "#4A90D9", letterSpacing: 1, fontWeight: 600 }}>
          我的群聊
        </div>

        {/* 群列表 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {GROUPS.map(g => (
            <div key={g.id}
              onClick={() => setActiveGroup(g.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", cursor: "pointer",
                background: activeGroup === g.id ? "#0f3460" : "transparent",
                borderLeft: activeGroup === g.id ? "3px solid #4A90D9" : "3px solid transparent",
                transition: "all 0.15s",
              }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: TYPE_COLOR[g.type] + "33",
                  border: `1.5px solid ${TYPE_COLOR[g.type]}66`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: TYPE_COLOR[g.type],
                }}>{g.avatar}</div>
                {g.dot && (
                  <div style={{
                    position: "absolute", top: -3, right: -3,
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#FF4D4F", border: "1.5px solid #16213e",
                  }} />
                )}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#d4d4d4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {g.name}
                </div>
                <div style={{ fontSize: 10.5, color: "#666", marginTop: 2 }}>{g.type}群 · {g.count}人</div>
              </div>
            </div>
          ))}
        </div>

        {/* 底部 Q仔 标识 */}
        <div style={{
          padding: "12px 14px", borderTop: "1px solid #0f3460",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #4A90D9, #9B59B6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff",
          }}>Q</div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#4A90D9" }}>Q 仔时间胶囊</div>
            <div style={{ fontSize: 10, color: "#555" }}>AI 时间管家 · 运行中</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          中栏 · 聊天区
      ══════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#1a1a2e" }}>
        {/* 顶栏 */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #0f3460",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#16213e",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: TYPE_COLOR[currentGroup?.type || "课程"],
            }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e8e8" }}>{currentGroup?.name}</span>
            <span style={{ fontSize: 11, color: "#555", marginLeft: 4 }}>{currentGroup?.count}人</span>
          </div>
          <div style={{
            fontSize: 11, color: "#4A90D9", background: "#0f3460",
            padding: "3px 10px", borderRadius: 12, border: "1px solid #1a4a7a",
          }}>
            Q 仔监听中 · 静默识别
          </div>
        </div>

        {/* 聊天消息 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {(messages[activeGroup] || []).map(msg => (
            <div key={msg.id} style={{
              display: "flex", flexDirection: msg.self ? "row-reverse" : "row",
              alignItems: "flex-start", gap: 8,
            }}>
              {!msg.self && (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: msg.isAI
                    ? "linear-gradient(135deg, #4A90D9, #9B59B6)"
                    : "#2a2a4a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: msg.isAI ? "#fff" : "#aaa",
                  border: msg.isAI ? "1.5px solid #4A90D9" : "none",
                }}>
                  {msg.isAI ? "Q" : msg.sender?.[0]}
                </div>
              )}
              <div style={{ maxWidth: "65%" }}>
                {!msg.self && (
                  <div style={{ fontSize: 11, color: msg.isAI ? "#4A90D9" : "#666", marginBottom: 4, fontWeight: msg.isAI ? 600 : 400 }}>
                    {msg.sender}
                  </div>
                )}
                <div style={{
                  padding: "9px 13px", borderRadius: msg.self ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                  background: msg.self ? "linear-gradient(135deg, #4A90D9, #2563EB)"
                    : msg.isAI ? "linear-gradient(135deg, #1a3a5c, #1e2d5a)"
                    : "#222840",
                  color: "#e8e8e8", fontSize: 13, lineHeight: 1.6,
                  border: msg.isAI ? "1px solid #4A90D933" : "none",
                  whiteSpace: "pre-line",
                }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 3, textAlign: msg.self ? "right" : "left" }}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* 输入框(装饰性) */}
        <div style={{
          padding: "10px 16px", borderTop: "1px solid #0f3460", background: "#16213e",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            flex: 1, height: 36, background: "#222840", borderRadius: 8,
            border: "1px solid #0f3460", padding: "0 12px",
            display: "flex", alignItems: "center",
            fontSize: 12, color: "#444",
          }}>发送消息…</div>
          <div style={{
            padding: "7px 16px", borderRadius: 8,
            background: "#4A90D9", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>发送</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          右栏 · 胶囊侧栏
      ══════════════════════════════════════════════════════ */}
      <div style={{
        width: 300, background: "#16213e", borderLeft: "1px solid #0f3460",
        display: "flex", flexDirection: "column",
      }}>
        {/* 侧栏标题 */}
        <div style={{
          padding: "14px 16px", borderBottom: "1px solid #0f3460",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e8e8" }}>时间胶囊</span>
            {pendingCount > 0 && (
              <div style={{
                background: "#FF4D4F", color: "#fff", fontSize: 11, fontWeight: 700,
                padding: "1px 7px", borderRadius: 10,
              }}>{pendingCount}</div>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#4A90D9" }}>全部 · {capsules.length}</div>
        </div>

        {/* 胶囊列表 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {capsules.map(cap => {
            const style = CAPSULE_STYLES[cap.type] || CAPSULE_STYLES.pending;
            const isNew = newCapsuleIds.includes(cap.id);
            const isFlying = flyingCapsule === cap.id;
            return (
              <div key={cap.id} style={{
                background: style.bg, border: `1.5px solid ${style.border}`,
                borderRadius: 14, padding: "11px 13px",
                transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                transform: isFlying ? "scale(1.04) translateX(-8px)" : "scale(1)",
                boxShadow: isNew ? `0 0 0 2px ${style.border}66, 0 4px 16px ${style.border}44` : "0 1px 6px rgba(0,0,0,0.08)",
              }}>
                {/* 胶囊头部 */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: style.dot, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a2e", flex: 1 }}>{cap.title}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: style.badge,
                    background: style.badge + "22", padding: "1px 7px", borderRadius: 8,
                  }}>{style.label}</span>
                </div>

                {/* 胶囊内容 */}
                <div style={{ fontSize: 12, color: "#3a3a5c", lineHeight: 1.55, marginBottom: 8, whiteSpace: "pre-line" }}>
                  {cap.type === "sensitive" ? "●●●● ●●●●●●●● ●●" : cap.content}
                </div>

                {/* 来源 */}
                <div style={{ fontSize: 10.5, color: "#999", marginBottom: cap.type !== "confirmed" ? 8 : 0 }}>
                  来自 {cap.group} · {cap.from} · {cap.time}
                </div>

                {/* 操作按钮 */}
                {cap.type !== "confirmed" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => confirmCapsule(cap.id)} style={{
                      flex: 1, padding: "5px 0", borderRadius: 8, border: "none",
                      background: style.badge, color: "#fff",
                      fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    }}>✓ 确认入日程</button>
                    <button onClick={() => dismissCapsule(cap.id)} style={{
                      padding: "5px 10px", borderRadius: 8,
                      border: `1px solid ${style.border}`, background: "transparent",
                      color: "#999", fontSize: 11.5, cursor: "pointer",
                    }}>✗</button>
                  </div>
                )}
                {cap.type === "confirmed" && (
                  <div style={{ fontSize: 11, color: "#52C41A", fontWeight: 600 }}>✓ 已加入日程</div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部按钮 */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid #0f3460" }}>
          <button onClick={() => setReminderModal(true)} style={{
            width: "100%", padding: "9px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #4A90D9, #7B68EE)",
            color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
          }}>💬 生成提醒文案</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          演示控制条
      ══════════════════════════════════════════════════════ */}
      <div style={{
        position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
        background: "rgba(22,33,62,0.97)", border: "1px solid #4A90D955",
        borderRadius: 18, padding: "10px 18px",
        display: "flex", gap: 10, alignItems: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)", zIndex: 1000,
      }}>
        <span style={{ fontSize: 11, color: "#4A90D9", fontWeight: 700, marginRight: 4 }}>🎮 演示场景</span>
        {[
          { label: "📎 模拟 DDL 抓取", action: simulateDDL, color: "#FA8C16" },
          { label: "🚨 模拟冲突检测", action: simulateConflict, color: "#FF4D4F" },
          { label: "📅 群体排期", action: simulateSchedule, color: "#7B68EE" },
          { label: "📋 22:00 日报", action: showDailyReport, color: "#4A90D9" },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} style={{
            padding: "6px 13px", borderRadius: 10, border: `1.5px solid ${btn.color}55`,
            background: btn.color + "22", color: btn.color,
            fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}>{btn.label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          日报弹窗
      ══════════════════════════════════════════════════════ */}
      {dailyReport && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
        }} onClick={() => setDailyReport(false)}>
          <div style={{
            background: "#16213e", border: "1px solid #4A90D9",
            borderRadius: 20, padding: "28px 30px", width: 380,
            boxShadow: "0 20px 60px rgba(74,144,217,0.2)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 13, color: "#4A90D9", fontWeight: 700, marginBottom: 4 }}>🌙 Q 仔 · 晚间日报</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#e8e8e8", marginBottom: 16 }}>今天有 {pendingCount} 条待确认</div>
            {capsules.filter(c => c.type === "pending" || c.type === "conflict").map(cap => (
              <div key={cap.id} style={{
                background: CAPSULE_STYLES[cap.type].bg,
                border: `1px solid ${CAPSULE_STYLES[cap.type].border}`,
                borderRadius: 10, padding: "10px 13px", marginBottom: 8,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a2e" }}>{cap.title}</div>
                <div style={{ fontSize: 11.5, color: "#555", marginTop: 3 }}>{cap.content.slice(0, 40)}…</div>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: "#555", margin: "12px 0" }}>点击任意卡片前往确认，预计耗时 30 秒</div>
            <button onClick={() => setDailyReport(false)} style={{
              width: "100%", padding: "10px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #4A90D9, #7B68EE)",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>开始确认 →</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          提醒文案弹窗
      ══════════════════════════════════════════════════════ */}
      {reminderModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
        }} onClick={() => { setReminderModal(false); setSentReminder(false); }}>
          <div style={{
            background: "#16213e", border: "1px solid #4A90D9",
            borderRadius: 20, padding: "28px 28px", width: 400,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e8e8e8", marginBottom: 4 }}>💬 生成提醒文案</div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>产品赛截止还剩 6 小时 · 选择发送风格</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {REMINDER_STYLES.map((s, i) => (
                <button key={i} onClick={() => setSelectedStyle(i)} style={{
                  padding: "6px 12px", borderRadius: 10,
                  border: `1.5px solid ${selectedStyle === i ? "#4A90D9" : "#0f3460"}`,
                  background: selectedStyle === i ? "#4A90D922" : "transparent",
                  color: selectedStyle === i ? "#4A90D9" : "#888",
                  fontSize: 12, cursor: "pointer", fontWeight: selectedStyle === i ? 700 : 400,
                }}>{s.icon} {s.label}</button>
              ))}
            </div>
            <div style={{
              background: "#1a1a2e", border: "1px solid #0f3460", borderRadius: 12,
              padding: "14px 16px", fontSize: 13, color: "#d4d4d4", lineHeight: 1.6,
              marginBottom: 16, minHeight: 56,
            }}>
              {REMINDER_STYLES[selectedStyle].text}
            </div>
            {!sentReminder ? (
              <button onClick={() => setSentReminder(true)} style={{
                width: "100%", padding: "10px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #4A90D9, #7B68EE)",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>一键发送到群聊</button>
            ) : (
              <div style={{ textAlign: "center", color: "#52C41A", fontWeight: 700, fontSize: 14, padding: "8px 0" }}>
                ✅ 已发送！将于截止前 6 小时自动发出
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          群体排期弹窗
      ══════════════════════════════════════════════════════ */}
      {scheduleModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
        }} onClick={() => setScheduleModal(false)}>
          <div style={{
            background: "#16213e", border: "1px solid #7B68EE",
            borderRadius: 20, padding: "28px", width: 380,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e8e8e8", marginBottom: 4 }}>📅 Q 仔 · 群体排期</div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>已计算所有人共同空闲时段（不展示个人具体安排）</div>
            {[
              { time: "本周六 14:00–16:00", hot: true },
              { time: "本周日 10:00–12:00", hot: false },
              { time: "下周六 15:00–17:00", hot: false },
            ].map((slot, i) => (
              <div key={i} style={{
                background: slot.hot ? "#7B68EE22" : "#1a1a2e",
                border: `1.5px solid ${slot.hot ? "#7B68EE" : "#0f3460"}`,
                borderRadius: 12, padding: "12px 16px", marginBottom: 8,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 13, color: slot.hot ? "#b39ddb" : "#888", fontWeight: slot.hot ? 700 : 400 }}>
                  {slot.hot && "🔥 "}{slot.time}
                </span>
                <button onClick={() => { setScheduleModal(false); showToast("✅ 已写入所有人日程！", "#7B68EE"); }} style={{
                  padding: "5px 12px", borderRadius: 8, border: "none",
                  background: slot.hot ? "#7B68EE" : "#2a2a4a",
                  color: "#fff", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                }}>就这个</button>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>
              * 任一人确认后自动写入全部参与者日程，个人具体安排不对他人可见
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #0f3460; border-radius: 4px; }
      `}</style>
    </div>
  );
}

