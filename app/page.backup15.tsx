"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════
// 类型定义（含新增类型）
// ══════════════════════════════════════════════════════════
type ChatType = "group" | "private";
type Chat = { id:number; type:ChatType; name:string; category:string; avatar:string; color:string; count?:number; lastTime:string; lastMsg:string; unread:number; pinned?:boolean; online?:boolean; };
type Message = { id:number; sender:string; content:string; time:string; self:boolean; isAI?:boolean; date?:string; isSystem?:boolean; atMe?:boolean; isFlight?:boolean; flightNo?:string; };
type Priority = "high"|"medium"|"low";
type ScheduleEvent = { id:number; date:string; startTime:string; endTime:string; title:string; location?:string; type:"class"|"task"|"event"|"exam"|"travel"; color:string; priority?:Priority; fromCapsule?:boolean; groupName?:string; flightNo?:string; };
type CapsuleType = "pending"|"confirmed"|"conflict"|"plan"|"sensitive"|"travel";
type Capsule = { id:number; type:CapsuleType; importance:Priority; group:string; title:string; content:string; rawContent?:string; time:string; from:string; new:boolean; scheduleData?:Partial<ScheduleEvent>; createdAt?:string; flightNo?:string; };
type AiMsg = { role:"user"|"ai"|"partner"; content:string; sender?:string };
type CtxMenu = { x:number; y:number; msg:Message; cid:number }|null;
type CapsuleFilter = "all"|"week"|"event"|"conflict"|"confirmed"|"info";
type EventForm = { title:string; date:string; startTime:string; endTime:string; location:string; type:ScheduleEvent["type"]; priority:Priority; };
type SharedMode = { chatId:number; partnerName:string; partnerColor:string }|null;
type FlightInfo = { flightNo:string; from:string; to:string; sTime:string; eTime:string; status:"正常"|"延误"|"取消"; delay?:string; gate?:string; };

// ── 新增类型 ──────────────────────────────────────────────
/** 智能检索结果 */
type SearchResult = {
  msgId: number;
  chatId: number;
  chatName: string;
  sender: string;
  content: string;
  time: string;
  isSensitive: boolean;
  matchedKeyword: string;
  date?: string;
};
/** AI 学习日志条目 */
type LearningEntry = {
  type: "auto-miss"|"manual-add"|"preference-update"|"ignore";
  content: string;
  time: string;
  icon: string;
};
/** 优先级偏好节点 */
type PriorityNode = {
  id: string;
  label: string;
  level: 1|2|3|4;
  color: string;
  desc: string;
  learnedFrom: string;
};
/** 跨群分析标签（右侧 Tab）*/
type RightTab = "schedule"|"capsule"|"priority"|"cross"|"profile";

// ══════════════════════════════════════════════════════════
// 老师画像数据
// ══════════════════════════════════════════════════════════
const TEACHER_PROFILES: Record<string,{icon:string;label:string;color:string;detail:string;evidence:string[]}> = {
  "张老师":      {icon:"⚠️", label:"从不延期",        color:"#FF4D4F", detail:"本学期已发出3次DDL提醒，本次措辞紧迫度↑，历史上从不接受补交",
    evidence:["4/22「本周课后作业截止周三」","4/28「再次提醒：不接受补交」","今天「务必按时提交」"]},
  "翁一士":      {icon:"📊", label:"重视过程",         color:"#7B68EE", detail:"喜欢看中间数据与实验过程，缺席需提前告知",
    evidence:["「今天王闯这边会把图纸出了」","「明日组会线上」—重视出席率"]},
  "李老师":      {icon:"💡", label:"偏宽松",           color:"#52C41A", detail:"DDL通常可协商，更关注报告质量",
    evidence:["「实验DDL5月15日24点」","助教回复可用draw.io或手绘"]},
  "大赛官助sasa":{icon:"🏆", label:"官方通知·严格执行",color:"#FA8C16", detail:"官方渠道，截止时间严格执行，无例外",
    evidence:["「报名截止5月10日23:59」","「都需要：PPT+Demo视频」"]},
  "队友 周":     {icon:"🔥", label:"积极催促·截止意识强",color:"#FF6B6B",detail:"主动提醒团队DDL，执行力强",
    evidence:["「⏰ 初赛截止5月6日23:59」","「@全体成员 还剩7天」"]},
  "助教 陈学长": {icon:"📋", label:"规则清晰",          color:"#4A90D9", detail:"规则说明清晰，不接受补交",
    evidence:["「不接受补交，请大家务必提前完成」","「需要测试用例截图」"]},
};

// ══════════════════════════════════════════════════════════
// 优先级偏好树（AI 学习结果）
// ══════════════════════════════════════════════════════════
const PRIORITY_TREE: PriorityNode[] = [
  { id:"p1", label:"课程考试 / 作业 DDL", level:1, color:"#FF4D4F",
    desc:"从不放弃，截止前2天开始行动", learnedFrom:"来源：12次冲突均未放弃 · 历史完成率100%" },
  { id:"p2", label:"竞赛截止 / 正式评审", level:2, color:"#FA8C16",
    desc:"通常优先，即使有社团冲突", learnedFrom:"来源：创新赛连续3次优先 · 2次冲突选竞赛" },
  { id:"p3", label:"社团正式活动", level:3, color:"#FAAD14",
    desc:"可协商，2次请假记录", learnedFrom:"来源：摄影社外拍1次请假 · 协会活动1次调整" },
  { id:"p4", label:"娱乐出游 / 聚餐", level:4, color:"#52C41A",
    desc:"低优先，5次冲突均排后", learnedFrom:"来源：5次冲突均选择学业/竞赛优先" },
];

// ══════════════════════════════════════════════════════════
// AI 学习日志（预置）
// ══════════════════════════════════════════════════════════
const INIT_LEARNING_LOG: LearningEntry[] = [
  { type:"manual-add",   icon:"📝", time:"2026/05/04", content:"手动添加「计网调课 教三-204」→ 已学习：来自课程群的地点变更将自动识别（1次训练）" },
  { type:"ignore",       icon:"🚫", time:"2026/05/03", content:"忽略「摄影社聚餐通知」→ 已降低：社团娱乐类代办优先级" },
  { type:"preference-update", icon:"⬆️", time:"2026/05/01", content:"确认创新赛代办后立刻开始行动 → 已记录：竞赛类优先级提升" },
];

// ══════════════════════════════════════════════════════════
// Q仔用户画像数据
// ══════════════════════════════════════════════════════════
const PROFILE_DATA={
  taskPref:[
    {label:"课程作业",stars:5,desc:"从不错过，截止前2天开始行动"},
    {label:"竞赛项目",stars:4,desc:"积极参与，团队协作优先"},
    {label:"社团活动",stars:3,desc:"参与但可协商请假"},
    {label:"娱乐出行",stars:2,desc:"低优先，但会提前规划"},
  ],
  habits:[
    "通常在截止前 2 天开始行动",
    "下午 14:00–18:00 效率最高",
    "倾向先处理「非延期型」课程作业",
    "22:00 前集中确认当日代办",
  ],
  teacherStyles:[
    {name:"张老师",  tag:"严格",     detail:"本学期3次DDL提醒，从不延期",    color:"#FF4D4F"},
    {name:"翁老师",  tag:"重视过程", detail:"喜欢看中间数据，缺席需提前告知", color:"#7B68EE"},
    {name:"李老师",  tag:"偏宽松",   detail:"DDL可协商，关注报告质量",        color:"#52C41A"},
  ],
  remindStyleHistory:{0:2,1:5,2:1,3:3} as Record<number,number>,
  suggestion:"本周计网与创新赛同天截止（5月6日），合并来看可用时间约4小时。Q仔建议：今晚写计网，明日专注创新赛PPT。",
  initialLearned:[
    "手动调高「计网作业」优先级 ×1",
    "忽略「班费通知」代办",
    "偏好在 22:00 前确认当日代办",
    "对「毒舌室友风」提醒响应最快（响应率45%）",
  ],
};

// ══════════════════════════════════════════════════════════
// 已开启 Q仔 监听的群聊（默认集合）
// ══════════════════════════════════════════════════════════
const DEFAULT_MONITORED_GROUPS = new Set<number>([1, 4, 7, 9, 11]);

// ══════════════════════════════════════════════════════════
// 聊天列表
// ══════════════════════════════════════════════════════════
const CHATS: Chat[] = [
  { id:1,  type:"group",   name:"2026PCG校园AI产品创意大赛官方沟通群", category:"竞赛",    avatar:"🏆", color:"#FF6B6B", count:1010, lastTime:"15:08", lastMsg:"云上枫加入了群聊",             unread:9,  pinned:true },
  { id:2,  type:"group",   name:"王老师课题组 | 光学组",               category:"科研",    avatar:"🔬", color:"#7B68EE", count:18,   lastTime:"16:32", lastMsg:"翁一士: 明日组会线上",         unread:6,  pinned:true },
  { id:3,  type:"private", name:"张师兄",                              category:"联系人",  avatar:"张", color:"#52C41A",             lastTime:"16:05", lastMsg:"账号密码我发你了",             unread:1,  online:true },
  { id:4,  type:"group",   name:"计算机网络 · 课程群",                 category:"课程",    avatar:"📡", color:"#4A90D9", count:247,  lastTime:"14:20", lastMsg:"张老师: 周三DDL，提交学习通",  unread:3 },
  { id:5,  type:"group",   name:"数据结构与算法-2024秋",               category:"课程",    avatar:"📚", color:"#1989FA", count:189,  lastTime:"11:08", lastMsg:"周同学: 我画的红黑树流程图",   unread:0 },
  { id:6,  type:"group",   name:"操作系统课程群",                      category:"课程",    avatar:"💻", color:"#13C2C2", count:156,  lastTime:"昨天",  lastMsg:"助教: 实验3报告模板已上传",    unread:0 },
  { id:7,  type:"group",   name:"计科2101班级群",                      category:"班级",    avatar:"🎓", color:"#52C41A", count:32,   lastTime:"10:45", lastMsg:"班长: 班费收缴通知",           unread:2 },
  { id:8,  type:"group",   name:"计算机学院2026届毕业群",              category:"学院",    avatar:"🏫", color:"#FA8C16", count:487,  lastTime:"昨天",  lastMsg:"[公告] 毕业论文盲审说明",      unread:0 },
  { id:9,  type:"group",   name:"Team Phoenix · 创新创业大赛",         category:"竞赛",    avatar:"🔥", color:"#FF4D4F", count:5,    lastTime:"13:22", lastMsg:"我把PPT v3发群里了",           unread:4 },
  { id:10, type:"private", name:"队友 刘正昂",                         category:"联系人",  avatar:"刘", color:"#FF6B6B",             lastTime:"09:02", lastMsg:"争取今天下午",                 unread:0 },
  { id:11, type:"group",   name:"光影摄影社·成员群",                   category:"社团",    avatar:"📷", color:"#9B59B6", count:89,   lastTime:"昨天",  lastMsg:"周六外拍改情人谷",             unread:0 },
  { id:12, type:"group",   name:"校学生会宣传部",                      category:"学生组织",avatar:"📢", color:"#FFB347", count:24,   lastTime:"周一",  lastMsg:"[文件] 5月活动排期.xlsx",      unread:0 },
  { id:13, type:"private", name:"小美 💕",                             category:"好友",    avatar:"美", color:"#FF85A2",             lastTime:"15:30", lastMsg:"机票订好啦！周六见",            unread:2,  online:true },
  { id:14, type:"private", name:"班长 李同学",                         category:"联系人",  avatar:"李", color:"#52C41A",             lastTime:"10:50", lastMsg:"班费的事麻烦下",                unread:1 },
  { id:15, type:"private", name:"妈妈 ❤️",                            category:"家人",    avatar:"妈", color:"#F5222D",             lastTime:"昨天",  lastMsg:"记得吃饭啊孩子",                unread:0 },
  { id:16, type:"group",   name:"毕业摆烂群😴",                        category:"闲聊",    avatar:"🛋️",color:"#8C8C8C", count:8,    lastTime:"昨天",  lastMsg:"今天又没去图书馆",              unread:0 },
  { id:17, type:"group",   name:"校园活动志愿者群",                    category:"活动",    avatar:"🎪", color:"#36CFC9", count:64,   lastTime:"周日",  lastMsg:"5/12志愿排班已出",              unread:0 },
  { id:18, type:"group",   name:"计算机协会·成员群",                   category:"社团",    avatar:"🖥️",color:"#20B2AA", count:45,   lastTime:"10:45", lastMsg:"@Q仔 帮忙统计团建时间",         unread:15 },
  { id:20, type:"private", name:"陈晓雨（策划部）",                    category:"联系人",  avatar:"陈", color:"#36CFC9",             lastTime:"16:45", lastMsg:"那这个互动环节怎么设计",         unread:3,  online:true },
  { id:21, type:"private", name:"室友 老钱",                           category:"好友",    avatar:"钱", color:"#FA8C16",             lastTime:"昨天",  lastMsg:"我觉得你理解有误",              unread:0 },
];

// ══════════════════════════════════════════════════════════
// 聊天消息（MSGS[20] 已扩展为35条，体现方案争执全过程）
// ══════════════════════════════════════════════════════════
const MSGS: Record<number,Message[]> = {
  1:[
    {id:1,sender:"system",content:"hzh加入了群聊",time:"14:15",self:false,isSystem:true},
    {id:2,sender:"大赛官助sasa",content:"🎉【PCG校园AI产品创意大赛·选手沟通群公告】Hi～欢迎各位参赛选手！",time:"14:20",self:false,date:"4月22日 周二"},
    {id:3,sender:"大赛官助sasa",content:"📌 重要时间节点：\n• 报名截止：5月10日 23:59\n• 初赛作品提交：5月20日 23:59\n• 决赛答辩：6月15日 线下",time:"14:21",self:false},
    {id:4,sender:"Ashley",content:"请问初赛是提交PPT还是Demo视频？两个都要吗",time:"15:30",self:false},
    {id:5,sender:"大赛官助小刘",content:"@Ashley 都需要：1份产品PPT（不超过20页）+ 1段Demo视频（不超过5分钟）",time:"15:32",self:false},
    {id:6,sender:"你",content:"请问可以用第三方API吗？比如GPT-4之类的",time:"15:35",self:true},
    {id:7,sender:"大赛官助sasa",content:"@你 可以用，但优先推荐腾讯混元，决赛答辩时使用混元有加分项哦～",time:"15:36",self:false},
    {id:8,sender:"土豆片",content:"我们队还差一个产品同学，有没有想加入的呀",time:"15:50",self:false},
    {id:10,sender:"system",content:"云上枫加入了群聊",time:"15:08",self:false,isSystem:true,date:"4月25日 周五"},
    {id:11,sender:"云上枫",content:"大家好！请问这次比赛的评分维度有几个？",time:"15:10",self:false},
    {id:12,sender:"大赛官助sasa",content:"评分维度共5个：用户洞察（20%）、产品方案（30%）、AI原生能力（25%）、落地可行性（15%）、创新差异化（10%）",time:"15:12",self:false},
    {id:13,sender:"陈同学",content:"请问可以个人参赛还是必须组队",time:"09:10",self:false,date:"今天"},
    {id:14,sender:"大赛官助小刘",content:"鼓励1-3人组队，也支持1人参赛",time:"09:15",self:false},
    {id:15,sender:"你",content:"请问需要提交代码吗还是只要Demo就够了",time:"10:20",self:true},
    {id:16,sender:"大赛官助sasa",content:"@你 Demo可以是视频演示、交互原型或可运行代码，形式不限",time:"10:22",self:false},
  ],
  2:[
    {id:1,sender:"翁一士",content:"今天王闯这边会把图纸出了给到你们 @😇 @Monica 周六师妹们辛苦一下 把这周做的片子除膜除了",time:"09:32",self:false,date:"4月25日 周五"},
    {id:2,sender:"Monica",content:"收到",time:"09:35",self:false},
    {id:3,sender:"😇",content:"除完直接装板子寄吗",time:"09:40",self:false},
    {id:4,sender:"翁一士",content:"之前有寄过来那种塑料的大板子\n可以放那个里面寄",time:"09:42",self:false},
    {id:5,sender:"王闯",content:"下周三16:30开一次组会，请要展示的同学做好准备",time:"10:15",self:false},
    {id:7,sender:"翁一士",content:"@Yishi @王莉莉 @仲雪飞 三位老师好，五一期间，411/416有没有实验室要开展实验活动？",time:"14:20",self:false,date:"4月27日 周日"},
    {id:8,sender:"你",content:"xitai的片子是同一天做的吗？@哩哩",time:"15:00",self:true},
    {id:9,sender:"哩哩（刘黎黎）",content:"不是同一天，曝光是两个人，同一天仅一个人曝光",time:"15:08",self:false},
    {id:14,sender:"翁一士",content:"明日组会线上[旺柴][强]",time:"16:20",self:false,date:"今天"},
    {id:15,sender:"王闯",content:"[旺柴][强]",time:"16:21",self:false},
    {id:17,sender:"翁一士",content:"翁一士 邀请您参加腾讯会议\n📞 429组会\n🕐 2026/04/29 16:30-19:30",time:"16:32",self:false,atMe:true},
  ],
  3:[
    {id:1,sender:"张师兄",content:"师弟最近实验咋样，出数据了吗",time:"09:00",self:false,date:"4月24日 周四"},
    {id:2,sender:"你",content:"还在跑数据，衍射效率这边有点低",time:"09:05",self:true},
    {id:3,sender:"张师兄",content:"曝光量调多少了",time:"09:07",self:false},
    {id:4,sender:"你",content:"150mJ/cm² 按之前的参数来的",time:"09:08",self:true},
    {id:5,sender:"张师兄",content:"试试提到180，我上次这个参数效果更好",time:"09:10",self:false},
    {id:6,sender:"你",content:"好的，今天下午试试，谢谢师兄！",time:"09:11",self:true},
    {id:7,sender:"张师兄",content:"另外翁老师说要讲彩色的进展，你那边彩色片子啥时候能出来",time:"14:30",self:false},
    {id:8,sender:"你",content:"下周三之前应该能做完",time:"14:32",self:true},
    {id:11,sender:"张师兄",content:"展示一下吧，翁老师喜欢看过程",time:"14:36",self:false},
    {id:13,sender:"张师兄",content:"对了你用的是哪个型号的全息材料",time:"15:30",self:false,date:"今天"},
    {id:14,sender:"你",content:"Bayfol HX 200，实验室就这个",time:"15:32",self:true},
    {id:15,sender:"张师兄",content:"图纸我下午发你",time:"15:42",self:false},
    {id:16,sender:"你",content:"好嘞！师兄辛苦",time:"15:45",self:true},
    {id:17,sender:"你",content:"师兄，你有张老师教务系统的账号密码吗？我想预约211研讨室做实验分析用",time:"16:00",self:true},
    {id:18,sender:"张师兄",content:"有的，上个月改过。账号：zhanglab2024，密码：Lab@2024#，用完记得退出登录哈",time:"16:05",self:false},
    {id:19,sender:"你",content:"谢谢师兄！用完一定退出",time:"16:06",self:true},
  ],
  4:[
    {id:1,sender:"张老师",content:"同学们晚上好，本周的课程内容是TCP/UDP协议详解，预习材料已上传至学习通",time:"20:15",self:false,date:"4月22日 周二"},
    {id:2,sender:"助教 陈学长",content:"📌 第三章作业已发布：\n1. 完成课后习题3.1-3.8\n2. 编程题：实现简易TCP三次握手模拟\n3. 截止时间：5月6日 23:59\n4. 双平台提交：邮箱+学习通",time:"10:00",self:false,date:"4月25日 周五"},
    {id:3,sender:"你",content:"@助教 陈学长 请问编程题用Python还是C都可以吗",time:"10:30",self:true},
    {id:4,sender:"助教 陈学长",content:"@你 都可以，附上简要的注释和运行截图就行",time:"10:32",self:false},
    {id:5,sender:"李同学",content:"请问DDL会延期吗，五一假期写不完啊😭",time:"11:00",self:false},
    {id:6,sender:"助教 陈学长",content:"DDL不延期哦，五一前可以提前写",time:"11:05",self:false},
    {id:9,sender:"张老师",content:"📢 重要通知：本周四（4月30日）下午的课调到 教三-204，时间不变下午14:00开始",time:"14:00",self:false,date:"4月28日 周一"},
    {id:10,sender:"你",content:"收到",time:"14:05",self:true},
    {id:11,sender:"张老师",content:"再次提醒：第三章课后作业本周三（5月6日）23:59前提交，word格式，不少于3000字，发到课程邮箱，并同步提交到学习通平台",time:"14:20",self:false,date:"今天"},
    {id:12,sender:"助教 陈学长",content:"补充：不接受补交，请大家务必提前完成",time:"14:22",self:false},
  ],
  5:[
    {id:1,sender:"李老师",content:"🌟 本周实验：实现红黑树的插入、删除与查找操作",time:"08:30",self:false,date:"4月21日 周一"},
    {id:2,sender:"助教",content:"[文件] 实验报告模板.docx",time:"08:32",self:false},
    {id:5,sender:"你",content:"实验DDL是哪天？",time:"11:00",self:true},
    {id:6,sender:"助教",content:"@你 5月15日24点",time:"11:05",self:false},
    {id:7,sender:"周同学",content:"[图片]",time:"11:08",self:false,date:"今天"},
    {id:8,sender:"周同学",content:"我画的红黑树插入流程图，有不对的地方请大佬们指正🤝",time:"11:09",self:false},
  ],
  6:[
    {id:1,sender:"王教授",content:"同学们好，本周课程重点：进程调度算法（FCFS、SJF、RR）",time:"08:00",self:false,date:"4月21日 周一"},
    {id:2,sender:"助教",content:"实验3报告模板已上传，注意需要现场答辩",time:"16:20",self:false,date:"昨天"},
    {id:3,sender:"助教",content:"答辩时间：下周三（5月7日）下午14:00-17:00，机房405",time:"16:30",self:false},
  ],
  7:[
    {id:1,sender:"班长 李同学",content:"大家好，关于本学期末的班级毕业旅行，先摸一下底",time:"09:00",self:false,date:"4月24日 周四"},
    {id:10,sender:"班长 李同学",content:"📢【班费收缴通知】每人150元，5月15日前转账",time:"10:30",self:false,date:"今天"},
    {id:13,sender:"班长 李同学",content:"另外咱们班团建定在5月18日（周日），紫金山徒步",time:"10:45",self:false},
  ],
  8:[
    {id:1,sender:"学院辅导员",content:"各位同学，毕业前的各项流程请认真对待",time:"09:00",self:false,date:"4月20日 周日"},
    {id:9,sender:"教务老师",content:"【毕业论文盲审说明】初稿截止5月20日，盲审5/25-6/10，答辩6/15-18",time:"16:00",self:false,date:"昨天"},
  ],
  9:[
    {id:1,sender:"队友 王",content:"大家好，先确认一下分工，我负责市场调研和商业模式",time:"10:00",self:false,date:"4月24日 周四"},
    {id:2,sender:"队友 周",content:"我做技术方案和架构图",time:"10:05",self:false},
    {id:3,sender:"你",content:"我来做产品设计和PPT视觉",time:"10:07",self:true},
    {id:9,sender:"你",content:"我把PPT v3发群里了，大家看看",time:"11:20",self:true,date:"今天"},
    {id:10,sender:"你",content:"[文件] Team Phoenix_产品方案_v3.pptx",time:"11:21",self:true},
    {id:11,sender:"队友 王",content:"我看了，第8页商业模式那块有点单薄",time:"11:35",self:false},
    {id:14,sender:"队友 周",content:"⏰ 初赛截止5月6日23:59，下周一前要把所有材料定稿！",time:"13:00",self:false},
    {id:15,sender:"队友 周",content:"@全体成员 还剩 7 天，加油冲！",time:"13:01",self:false,atMe:true},
    {id:16,sender:"你",content:"收到，加油！",time:"13:22",self:true},
  ],
  10:[
    {id:1,sender:"队友 刘正昂",content:"哥们，PPT你那部分做好了吗",time:"09:00",self:false,date:"4月24日 周四"},
    {id:14,sender:"你",content:"框架基本出来了 [文件] 产品方案_框架v1.pptx",time:"15:05",self:true,date:"今天"},
    {id:15,sender:"队友 刘正昂",content:"结构不错！解决方案那页再加个流程图",time:"15:20",self:false},
    {id:19,sender:"队友 刘正昂",content:"争取今天下午把主体搞完，明天细化",time:"09:02",self:false},
  ],
  11:[
    {id:1,sender:"社长小明",content:"大家好！本学期第一次外拍活动定在下周六，报名接龙",time:"20:00",self:false,date:"4月20日 周日"},
    {id:11,sender:"社长小明",content:"周六外拍活动改到下午3点",time:"15:20",self:false,date:"昨天"},
    {id:13,sender:"社长小明",content:"对了，地点改到情人谷，下马坊站A出口 14:30",time:"19:45",self:false},
  ],
  12:[
    {id:1,sender:"宣传部长",content:"五月份咱们部门有三场活动，今天先开个预备会",time:"09:00",self:false,date:"4月20日 周日"},
    {id:11,sender:"宣传部长",content:"[文件] 5月活动排期.xlsx",time:"10:00",self:false,date:"周一"},
  ],
  13:[
    {id:1,sender:"小美",content:"在吗在吗！下个周末有空不",time:"10:00",self:false,date:"4月26日 周六"},
    {id:5,sender:"小美",content:"我看了一下，5月10日周六出发，5月12日周一回，刚好两天一晚",time:"10:12",self:false},
    {id:14,sender:"小美",content:"机票订好啦！🎉",time:"15:20",self:false,date:"今天"},
    {id:15,sender:"小美",content:"航班：MU5435，南京禄口 → 重庆江北\n5月10日 09:30 起飞，11:55 到达\n回程：MU5436，5月12日 18:00",time:"15:22",self:false},
    {id:16,sender:"你",content:"收到！我把这个加到日程里",time:"15:25",self:true},
    {id:17,sender:"小美",content:"酒店也订好了，洪崖洞旁边的，离观景台走路5分钟",time:"15:28",self:false},
    {id:18,sender:"小美",content:"机票订好啦！周六见",time:"15:30",self:false},
  ],
  14:[
    {id:5,sender:"班长 李同学",content:"兄弟，班费150记得交一下",time:"10:50",self:false,date:"今天"},
    {id:6,sender:"班长 李同学",content:"另外团建你去吗？",time:"10:51",self:false},
    {id:7,sender:"你",content:"班费今天转！团建我去",time:"10:55",self:true},
  ],
  15:[
    {id:9,sender:"妈妈",content:"记得吃饭啊孩子",time:"21:00",self:false,date:"昨天"},
    {id:10,sender:"你",content:"妈我吃的，你放心",time:"21:05",self:true},
  ],
  16:[
    {id:12,sender:"宿舍老二",content:"今天又没去图书馆",time:"15:20",self:false,date:"昨天"},
    {id:13,sender:"宿舍老三",content:"我也是，论文一个字没写",time:"15:22",self:false},
    {id:14,sender:"你",content:"看了一天b站😇",time:"15:30",self:true},
  ],
  17:[
    {id:1,sender:"活动部小张",content:"大家好，5月志愿活动安排出来了",time:"10:00",self:false,date:"4月20日 周日"},
    {id:2,sender:"活动部小张",content:"📅 5月排期：\n• 5/12 图书馆整理 8:00-12:00\n• 5/19 校园清洁 14:00-17:00\n• 5/26 毕业典礼引导 8:00-18:00",time:"10:02",self:false},
    {id:11,sender:"活动部小张",content:"5/12志愿排班已出，请大家在群文件查看",time:"14:00",self:false,date:"周日"},
  ],
  18:[
    {id:1,sender:"社长小李",content:"🎉 各位会员大家好！五月份协会打算组织一次线下团建，想提前统计大家方便的时间",time:"10:00",self:false,date:"今天"},
    {id:2,sender:"副社长小张",content:"我周末全天都有空，平时工作日晚上也可以",time:"10:03",self:false},
    {id:3,sender:"技术部 王磊",content:"我周一中午可以，其他时间基本有课",time:"10:05",self:false},
    {id:4,sender:"宣传部 小美",content:"工作日晚上可以！周末上午有家教",time:"10:07",self:false},
    {id:5,sender:"你",content:"我周六下午和周日全天都有空",time:"10:09",self:true},
    {id:6,sender:"运营部 小赵",content:"我周二早上可以，或者周末下午",time:"10:12",self:false},
    {id:7,sender:"技术部 林同学",content:"工作日晚上方便，周末要回家",time:"10:15",self:false},
    {id:8,sender:"策划部 小陈",content:"我都有时间！全程参与！",time:"10:16",self:false},
    {id:9,sender:"外联部 小周",content:"周六下午可以，周日有其他安排",time:"10:18",self:false},
    {id:10,sender:"财务部 小刘",content:"周三晚上和周末下午ok",time:"10:20",self:false},
    {id:16,sender:"技术部 小冯",content:"我5月10号之前有项目要交，10号以后随时都行",time:"10:35",self:false},
    {id:19,sender:"社长小李",content:"@Q仔 大家时间都回复得差不多了，帮忙统计一下什么时间段参与人数最多！",time:"10:42",self:false,atMe:true},
    {id:20,sender:"你",content:"等Q仔出结果👀",time:"10:45",self:true},
  ],
  // ── MSGS[20]：陈晓雨五四晚会方案讨论（增强版，35条，体现完整争执过程）──
  20:[
    // 阶段1：初始友好讨论（id 1-8）
    {id:1,  sender:"陈晓雨", content:"你好，关于下个月的五四主题晚会方案，想和你对一下思路", time:"14:00", self:false, date:"4月28日 周一"},
    {id:2,  sender:"你",     content:"好呀！我这边有些想法，三大板块：文艺演出、互动游戏、颁奖典礼，你觉得怎么样？", time:"14:02", self:true},
    {id:3,  sender:"陈晓雨", content:"三大板块框架我很认可！文艺演出那块你想放什么节目？", time:"14:05", self:false},
    {id:4,  sender:"你",     content:"我想：朗诵×2、舞蹈×1、合唱×1，控制在90分钟左右，给互动和颁奖留时间", time:"14:07", self:true},
    {id:5,  sender:"陈晓雨", content:"合理！互动游戏这块我们出发点一样，都想做「青春知识闯关」对吧", time:"14:09", self:false},
    {id:6,  sender:"你",     content:"对，历史知识竞答+抢答这个形式，年轻人会喜欢", time:"14:13", self:true},
    {id:7,  sender:"陈晓雨", content:"经费方面——总预算3000，演出道具/场地/奖品/主持/备用，我们先粗排一下", time:"14:15", self:false},
    {id:8,  sender:"你",     content:"演出道具800，场地布置800，奖品700，主持人200，备用500，差不多就这个比例", time:"14:18", self:true},
    // 阶段2：互动时长分歧（id 9-18）
    {id:9,  sender:"陈晓雨", content:"互动环节这边，我觉得至少要20分钟才能充分展开，题目多一点节目感强", time:"14:21", self:false},
    {id:10, sender:"你",     content:"我觉得15分钟足够了，时间太长观众容易疲惫，整体节奏会拖", time:"14:23", self:true},
    {id:11, sender:"陈晓雨", content:"15分钟我试过，才刚进入状态就结束了，不够充分。我们上次社团活动就搞了20分钟，反响很好", time:"14:26", self:false},
    {id:12, sender:"你",     content:"那次社团活动人少，互动密度不一样。晚会观众多，20分钟冷场风险大", time:"14:28", self:true},
    {id:13, sender:"陈晓雨", content:"冷场？！我们设计的是三轮：个人闯关、队伍竞赛、团队协作，结构很紧凑，哪会冷场", time:"14:30", self:false},
    {id:14, sender:"你",     content:"三轮20分钟，每轮才6-7分钟，时间根本不够展开。15分钟三轮反而更紧凑不拖沓", time:"14:33", self:true},
    {id:15, sender:"陈晓雨", content:"我不认同，互动环节本来就是晚会的高光，剪短了有什么意义", time:"14:35", self:false},
    {id:16, sender:"你",     content:"高光不等于时间长，精华和时长不是正比关系……", time:"14:37", self:true},
    {id:17, sender:"陈晓雨", content:"好，我们先跳过这个，聊下嘉宾邀请的问题", time:"14:40", self:false},
    {id:18, sender:"你",     content:"嗯，说说你的想法", time:"14:41", self:true},
    // 阶段3：嘉宾邀请分歧（id 19-24）
    {id:19, sender:"陈晓雨", content:"我想邀请一位校外创业者作为嘉宾来分享，五四精神+青年创业，主题很贴", time:"14:43", self:false},
    {id:20, sender:"你",     content:"校外嘉宾预算从哪出？3000的预算本来就紧，嘉宾交通+礼品至少要500-800", time:"14:45", self:true},
    {id:21, sender:"陈晓雨", content:"可以找学院追加预算，或者联系创业中心赞助，不一定要动3000的盘", time:"14:47", self:false},
    {id:22, sender:"你",     content:"追加预算不确定性太大，我们应该在可控范围内做方案，不能把方案建立在可能拿不到的资源上", time:"14:49", self:true},
    {id:23, sender:"陈晓雨", content:"你这个思路太保守了。晚会的影响力需要亮点，没有校外嘉宾就是普通的学生自嗨活动", time:"14:52", self:false},
    {id:24, sender:"你",     content:"保守？我是在做风险控制。你总是想往大了搞，但每次落地都出问题", time:"14:54", self:true},
    // 阶段4：情绪升温（id 25-32）
    {id:25, sender:"陈晓雨", content:"「你总是」？我哪次落地出问题了，你说具体的！",time:"14:56", self:false},
    {id:26, sender:"你",     content:"上次宣传活动不就超支了，最后你也没说清楚怎么回事",time:"14:57", self:true},
    {id:27, sender:"陈晓雨", content:"那次超支是场地临时变更，和我的策划没关系，你在乱扣帽子",time:"14:58", self:false},
    {id:28, sender:"你",     content:"反正这次我不想因为不确定的资源把方案搞砸，15分钟互动、不邀请校外嘉宾，我的立场不变",time:"15:00", self:true},
    {id:29, sender:"陈晓雨", content:"你根本没在认真听我说的。20分钟有道理你为什么不正面回应？",time:"15:01", self:false},
    {id:30, sender:"你",     content:"我回应了好几次了！是你一直在重复自己的观点，没有接受任何反驳",time:"15:03", self:true},
    {id:31, sender:"陈晓雨", content:"我接受反驳？！你说过的每一条我都回应了，是你听不进去！",time:"15:04", self:false},
    {id:32, sender:"你",     content:"……好，我们冷静一下",time:"15:06", self:true},
    // 阶段5：僵局（id 33-37）
    {id:33, sender:"陈晓雨", content:"行。那你说，最终方案怎么定？",time:"15:08", self:false},
    {id:34, sender:"你",     content:"我的立场还是15分钟+校内主持，在可控预算里做好",time:"15:09", self:true},
    {id:35, sender:"陈晓雨", content:"好，那就你看着办吧",time:"15:10", self:false},
    {id:36, sender:"陈晓雨", content:"那这个互动环节怎么设计",time:"16:45", self:false},
  ],
  21:[
    {id:1, sender:"室友 老钱",content:"我觉得你最近把宿舍公共区域搞得太乱了",time:"21:00",self:false,date:"昨天"},
    {id:15,sender:"室友 老钱",content:"……好，那我们先冷静一下吧，但公共区域的事情要解决",time:"21:30",self:false},
    {id:16,sender:"你",       content:"同意。我让Q仔帮我分析了一下，共享给你",time:"21:35",self:true},
    {id:20,sender:"室友 老钱",content:"我觉得你理解有误，是我觉得Q仔说的「两人均有道理」太圆滑了",time:"21:50",self:false},
  ],
};

// ══════════════════════════════════════════════════════════
// 其他数据（GROUP_SCHED, FLIGHTS, 日程, 代办等）
// ══════════════════════════════════════════════════════════
const GROUP_SCHED: Record<number,{gName:string;total:number;slots:{label:string;count:number;pct:number;who:string}[];best:{label:string;pct:number;date:string;sT:string;eT:string;title:string;color:string};note:string}> = {
  18:{gName:"计算机协会·团建",total:18,slots:[
    {label:"周六下午 14:00-17:00",count:16,pct:88,who:"张/小美/小赵/老高/小许等16人"},
    {label:"工作日晚上 19:00-21:00",count:14,pct:78,who:"宣传/财务/外联等14人"},
    {label:"周日全天",count:12,pct:67,who:"12人可参与"},
    {label:"周六上午",count:8,pct:44,who:"8人，部分有家教"},
  ],best:{label:"周六下午 14:00-17:00",pct:88,date:"2026-05-16",sT:"14:00",eT:"17:00",title:"💻 计算机协会团建",color:"#E0F7FA"},note:"建议5月10日之后的周六（等小冯结束项目），88%参与率最高"},
};

const FLIGHTS: Record<string,FlightInfo> = {
  "MU5435":{flightNo:"MU5435",from:"南京禄口T2",to:"重庆江北T3",sTime:"09:30",eTime:"11:55",status:"延误",delay:"延误40分钟，预计10:10起飞",gate:"B12"},
  "MU5436":{flightNo:"MU5436",from:"重庆江北T3",to:"南京禄口T2",sTime:"18:00",eTime:"20:25",status:"正常",gate:"待定"},
};

const TODAY = "2026-04-29";
const INIT_SCH: ScheduleEvent[] = [
  {id:1, date:"2026-04-29",startTime:"10:10",endTime:"11:00",title:"国家安全学",       location:"逸C-114",  type:"class",color:"#E3F2FD",priority:"medium"},
  {id:2, date:"2026-04-29",startTime:"18:30",endTime:"20:20",title:"中国近现代史纲要", location:"逸B-302",  type:"class",color:"#E1F5FE",priority:"medium"},
  {id:3, date:"2026-04-30",startTime:"14:00",endTime:"16:00",title:"计网课（教三-204）",location:"教三-204",type:"class",color:"#E3F2FD",priority:"medium"},
  {id:4, date:"2026-05-02",startTime:"10:00",endTime:"12:00",title:"数据结构实验课",   location:"机房302",  type:"class",color:"#E8F5E9",priority:"medium"},
  {id:5, date:"2026-05-06",startTime:"23:00",endTime:"23:59",title:"🔥 创新赛初赛截止",                     type:"task", color:"#FFF1F0",priority:"high"},
  {id:6, date:"2026-05-07",startTime:"14:00",endTime:"17:00",title:"操作系统实验3答辩", location:"机房405",  type:"exam", color:"#FFF0F6",priority:"high"},
  {id:7, date:"2026-05-06",startTime:"23:00",endTime:"23:59",title:"📎 计网作业截止",                       type:"task", color:"#FFE7BA",priority:"medium"},
  {id:8, date:"2026-05-10",startTime:"23:59",endTime:"23:59",title:"PCG报名截止",                           type:"task", color:"#FFF1F0",priority:"medium"},
  {id:9, date:"2026-05-12",startTime:"08:00",endTime:"12:00",title:"志愿服务·图书馆",   location:"图书馆",   type:"event",color:"#F0FFF4",priority:"low"},
  {id:10,date:"2026-05-15",startTime:"23:59",endTime:"23:59",title:"数据结构实验DDL",                       type:"task", color:"#FFE7BA",priority:"high"},
];

const IMP:Record<Priority,{bg:string;border:string;badge:string;dot:string;label:string}> = {
  high:   {bg:"#FFF1F0",border:"#FF7875",badge:"#FF4D4F",dot:"#FF4D4F",label:"紧急"},
  medium: {bg:"#FFF7E6",border:"#FFB340",badge:"#FA8C16",dot:"#FA8C16",label:"重要"},
  low:    {bg:"#FFFBE6",border:"#FFD666",badge:"#FAAD14",dot:"#FAAD14",label:"一般"},
};
const TYPE_ST:Record<string,{bg:string;border:string;badge:string;dot:string;label:string}> = {
  confirmed:{bg:"#F6FFED",border:"#95DE64",badge:"#52C41A",dot:"#52C41A",label:"已确认"},
  plan:     {bg:"#EFF6FF",border:"#93C5FD",badge:"#3B82F6",dot:"#3B82F6",label:"方案参考"},
  sensitive:{bg:"#F5F5F5",border:"#D9D9D9",badge:"#8C8C8C",dot:"#8C8C8C",label:"敏感信息"},
  travel:   {bg:"#E6FFFB",border:"#87E8DE",badge:"#13C2C2",dot:"#13C2C2",label:"出行监控"},
};
const getCS=(c:Capsule)=>{
  if(c.type==="confirmed")return TYPE_ST.confirmed;
  if(c.type==="plan")     return TYPE_ST.plan;
  if(c.type==="sensitive")return TYPE_ST.sensitive;
  if(c.type==="travel")   return TYPE_ST.travel;
  if(c.type==="conflict") return IMP.high;
  return IMP[c.importance]||IMP.medium;
};
const prColor=(p?:Priority)=>p==="high"?"#FF4D4F":p==="medium"?"#FA8C16":"#52C41A";

const INIT_CAPS:Capsule[]=[
  {id:101,type:"pending", importance:"medium",group:"计算机网络 · 课程群",title:"📎 第三章作业 DDL",  content:"5月6日 23:59 前提交\nWord格式，不少于3000字\n邮箱+学习通双平台",            time:"14:20",from:"张老师",  new:true, createdAt:TODAY,scheduleData:{date:"2026-05-06",startTime:"23:00",endTime:"23:59",title:"📎 计网作业截止",type:"task",color:"#FFE7BA",priority:"medium"}},
  {id:102,type:"pending", importance:"medium",group:"计网课程群",          title:"📍 周四课地点变更", content:"4月30日 14:00 → 教三-204\n时间不变",                                       time:"14:00",from:"张老师",  new:true, createdAt:TODAY,scheduleData:{date:"2026-04-30",startTime:"14:00",endTime:"16:00",title:"🔄 计网课（教三-204）",type:"class",color:"#E6F7FF",priority:"medium"}},
  {id:103,type:"conflict",importance:"high",  group:"摄影社 × 竞赛",       title:"⚠️ 周六下午时间冲突",content:"周六14:00 摄影外拍（情人谷·下马坊A口）\n周六14:30 创新赛内部评审\n两者不可兼得",  time:"16:32",from:"AI 检测", new:true, createdAt:TODAY},
  {id:104,type:"plan",    importance:"low",   group:"小美 💕",             title:"🗺️ 重庆出行已确定", content:"✅ 5月10日 09:30 飞机出发\n👥 你 + 小美\n✈️ MU5435 南京→重庆",                  time:"15:30",from:"AI 总结", new:false,createdAt:TODAY},
  {id:105,type:"pending", importance:"high",  group:"Team Phoenix",       title:"🔥 初赛截止 5/6",   content:"PPT + Demo视频 + 申报书\n建议5/5前定稿留出buffer\n⏰ 还剩7天！",          time:"13:01",from:"队友 周", new:true, createdAt:TODAY,scheduleData:{date:"2026-05-06",startTime:"23:00",endTime:"23:59",title:"🔥 创新赛初赛截止",type:"task",color:"#FFF1F0",priority:"high"}},
  {id:106,type:"pending", importance:"high",  group:"王老师课题组",        title:"🔬 今日组会 16:30", content:"4月29日 16:30-19:30\n腾讯会议线上",                                       time:"16:32",from:"翁一士",  new:true, createdAt:TODAY,scheduleData:{date:"2026-04-29",startTime:"16:30",endTime:"19:30",title:"🔬 课题组组会(线上)",type:"event",color:"#F9F0FF",priority:"high"}},
];

// ══════════════════════════════════════════════════════════
// AI 总结内容
// ══════════════════════════════════════════════════════════
const AI_SUM:Record<number,string>={
  1: "📋 **对话总结（PCG大赛群）**\n\n• 提交：PPT（≤20页）+ Demo视频（≤5分钟）\n• 报名截止：5月10日，初赛提交：5月20日\n• 评分5维度：用户洞察/产品方案/AI能力/落地/创新\n\n📌 **待办**\n1. 报名截止 5月10日\n2. Demo视频准备",
  2: "📋 **对话总结（课题组）**\n\n• 今日重点：16:30 腾讯会议组会\n• 实验进展：横向周期偏差10nm\n\n📌 **待办**\n1. ⚡ 今天16:30参加腾讯会议\n2. 整理彩色样品进展",
  3: "📋 **对话总结（张师兄）**\n\n• 实验：曝光量调整建议（150→180mJ/cm²）\n• 师兄分享了张老师教务系统账号密码（用于研讨室预约）\n• ⚠️ 涉及隐私信息，已加密存入代办\n\n📌 **待办**\n1. 调整曝光参数重做实验\n2. 用账号预约211研讨室（需密码解锁查看）",
  4: "📋 **对话总结（计网群）**\n\n• ⚡ 第三章作业DDL：5月6日23:59\n• 作业：Word格式，3000字，学习通+邮箱双提交\n• 地点变更：4月30日课改到教三-204\n\n📌 **紧急待办**\n1. ⚡ 计网作业（还有7天）\n2. 周四注意换教室",
  9: "📋 **对话总结（Team Phoenix）**\n\n• 截止：5月6日23:59，还剩7天\n• v3问题：商业模式单薄、用户画像不具体\n\n📌 **紧急待办**\n1. 今晚出PPT v4\n2. 等队友素材（周五截止）",
  10:"📋 **对话总结（队友 刘正昂）**\n\n• PPT框架已完成，竞品对比已收到\n• 调研数据整理中，今晚出第一稿\n\n📌 **待办**\n1. ⚡ 初赛截止 5月6日（还剩7天）\n2. 今晚出PPT第一稿",
  13:"📋 **重庆出行计划总结**\n\n**✅ 已确认：**\n• 出行时间：5月10日（周六）-5月12日（周一）两天一晚\n• 出行方式：✈️ 飞机\n• 去程：MU5435 南京禄口 → 重庆江北 09:30-11:55\n• 回程：MU5436 18:00 起飞\n• 住宿：洪崖洞旁边酒店（已订）\n• 同行：你、小美 2人",
  18:"📋 **群体排期分析（计算机协会团建）**\n\n基于 18 位成员回复：\n\n🏆 **最佳时间：**\n① **周六下午 14:00-17:00** — 88%（16/18人）✅\n② 工作日晚上 — 78%\n③ 周日全天 — 67%\n\n⚠️ 小冯5月10号前有项目，建议10号后的周六",
  // ── MSGS[20] 协作分析专用格式 ──
  20:"🤖 **Q仔分析 · 陈晓雨对话（选中 id 9-32，共22条）**\n\n---\n\n📌 **核心分歧（事实层面）**\n\n① **互动环节时长**\n• 你的立场：15分钟，担心20分钟节奏拖沓、冷场风险大\n• 陈晓雨的立场：20分钟，认为三轮结构紧凑、上次活动反响好\n• 客观评估：两者均有合理依据。时长选择取决于环节设计质量，可折中为17分钟并增设应急剪短预案。\n\n② **嘉宾邀请方式**\n• 你的立场：不邀请校外嘉宾，优先在3000预算内做可控方案\n• 陈晓雨的立场：邀请校外创业者，通过学院或赞助解决额外经费\n• 客观评估：校外嘉宾确有亮点价值，但资源不确定性是真实风险。建议：先纳入「备选方案」，主方案不依赖外部资源。\n\n---\n\n💬 **情绪信号（已过滤，不作为判断依据）**\n「你总是」「你根本没理解」「太保守了」等措辞已识别为情绪化表达，Q仔在分析中不将其作为立场判断依据。\n\n---\n\n✅ **已达成共识**\n• 三大板块框架：文艺演出 + 互动游戏 + 颁奖典礼 ✓\n• 演出节目：朗诵×2、舞蹈×1、合唱×1（约90分钟）✓\n• 互动形式：「青春知识闯关」三轮制 ✓\n• 经费分配框架：演出道具800/场地800/奖品700/主持200/备用500 ✓\n\n---\n\n💡 **Q仔建议的折中方案**\n1. 互动时长：定为 **17分钟**，设计3轮但主持人有权在第2轮后根据现场节奏决定是否完整进行第3轮\n2. 嘉宾邀请：**纳入备选**，主方案不依赖；若学院预算追加成功，则升级执行\n\n📤 可以共享给陈晓雨，一起和 Q仔 讨论这份分析 →",
  21:"📋 **对话分析（宿舍矛盾）**\n\n**争议核心：**\n• 老钱：公共区域整洁诉求\n• 你：部分责任归属不清，沟通方式不适\n\n**客观分析：**\n两人均有一定道理。「你太敏感」会关闭对话而非解决问题。\n\n💡 **化解建议：**\n1. 约定公共区域规则（杂物24h内清理）\n2. 沟通时多用「我感觉……」\n3. 先冷静，情绪激动时不谈实质\n\n📤 可以共享这份分析给对方 →",
};

// ══════════════════════════════════════════════════════════
// 跨群分析：预设回复内容
// ══════════════════════════════════════════════════════════
const CROSS_ANALYSIS_INTRO = "👋 你好！我已整合了你在 **5个群聊 + 课表 + 代办** 中的所有信息。\n\n有什么想问我的？比如：\n• 我这周该先做什么？\n• 我今天应该做什么？\n• 最近哪个 DDL 最危险？";

const CROSS_ANALYSIS_REPLIES: Record<string, string> = {
  today: `📊 **今日概览（4月29日 周二）**

🔴 **高风险提醒**
• 今天 16:30 有课题组组会（腾讯会议），不可缺席
• 计网作业 & 创新赛初赛同天截止（5月6日），距今仅 **7天**

---

🧠 **Q仔推断：今日任务估时**
| 任务 | 预计耗时 | 依据 |
|------|---------|------|
| 课题组组会（16:30-19:30） | 3小时（固定） | 翁一士邀请已确认 |
| 计网第三章作业 | **约2小时**（今日起步）| 历史：类似3000字报告平均2.5H；本次已有框架 |
| 创新赛PPT修改 | **约4天总量** | v3已有基础，商业模式+用户画像需重做 |

---

📅 **今日行动方案**

**09:00-12:00**（效率最高时段）
→ 整理计网第三章笔记，完成习题3.1-3.5
→ 预计完成度：50%  ⏱ 约3H

**12:00-14:00** 午休+查阅TCP编程资料

**14:00-16:00**
→ 完成TCP三次握手编程题雏形
→ 预计完成度：80%  ⏱ 约2H

**16:30-19:30** 📞 课题组组会（不可挪动）

**20:00-21:30**
→ 和队友确认创新赛PPT分工，今晚出v4框架
→ Q仔建议：今晚先理思路，明天上午集中写

---

📎 **数据来源**（点击可跳转原始消息）
• [计网作业DDL] 计算机网络群 · 助教陈学长 · 4/25 10:00
• [创新赛截止] Team Phoenix · 队友周 · 今天 13:01
• [组会通知] 课题组 · 翁一士 · 今天 16:32`,

  week: `📊 **本周概览（4/29-5/5）**

⚡ **高风险日：5月6日（周三）**
→ 计网作业截止 23:59（来源：课程群4/25）
→ 创新赛初赛截止 23:59（来源：竞赛群5/1）
→ 两件同天，Q仔判断：**今天必须双线推进**

---

🧠 **本周净可用时间估算：约 16 小时**
（扣除：课程10H + 今日组会3H + 睡眠/日常）

📅 **分天建议**
• 4/29（今天）：完成计网习题50% + 组会 + 创新赛v4框架
• 4/30（周三）：计网编程题 + 创新赛商业模式补充
• 5/1（五一）：计网收尾 + 创新赛用户画像重写
• 5/2-5/4：创新赛PPT精修 + 视频录制准备
• 5/5（周日）：全稿review + buffer

📎 **来源标注**
• 操作系统答辩 5/7 机房405 [操作系统群 · 昨天]
• 数据结构实验DDL 5/15 [数据结构群 · 4/21]`,

  danger: `⚡ **最危险的 DDL 分析**

🔴 **最高风险：5月6日（7天后）**
同天双截止 → 计网作业 + 创新赛初赛

Q仔判断依据：
• 计网作业：3000字Word，需编程题运行截图，预估剩余工作量 **约5H**
• 创新赛：PPT商业模式+用户画像需重做，Demo视频未录，预估 **约18H**
• 本周净可用时间：约16H → **已告急**

🟠 **次高风险：5月7日（8天后）**
操作系统实验3现场答辩，机房405，**不可缺席**

建议：今天起进入「双线冲刺模式」`,
};

// ══════════════════════════════════════════════════════════
// 智能检索：关键词扩展函数（前端模拟 AI 扩展）
// ══════════════════════════════════════════════════════════
function expandKeywords(query: string): string[] {
  const q = query.toLowerCase();
  if (q.includes("密码") || q.includes("账号") || q.includes("教务")) {
    return ["账号", "password", "ID", "登录", "教务", "系统", "研讨室"];
  }
  if (q.includes("计网") || q.includes("作业") || q.includes("ddl") || q.includes("截止")) {
    return ["DDL", "截止", "提交", "23:59", "学习通", "计算机网络", "作业"];
  }
  if (q.includes("组会") || q.includes("腾讯会议")) {
    return ["组会", "腾讯会议", "16:30", "翁一士", "线上", "明日"];
  }
  if (q.includes("竞赛") || q.includes("创新") || q.includes("初赛")) {
    return ["初赛", "截止", "5月6日", "PPT", "Demo", "创新赛", "Team Phoenix"];
  }
  if (q.includes("重庆") || q.includes("出行") || q.includes("机票")) {
    return ["重庆", "机票", "MU5435", "南京", "小美", "5月10日", "出发"];
  }
  if (q.includes("外拍") || q.includes("摄影") || q.includes("社团")) {
    return ["摄影社", "外拍", "情人谷", "周六", "下午", "社团"];
  }
  // 通用：提取词并附加同义词
  const words = query.split(/\s+/).filter(w => w.length > 0);
  return [...new Set([...words, ...words.map(w => w.slice(0, 2))])].slice(0, 6);
}

/** 在当前 chat 的消息里执行智能检索，返回匹配结果 */
function smartSearch(query: string, chatId: number, chats: Chat[], msgs: Record<number, Message[]>): SearchResult[] {
  const keywords = expandKeywords(query);
  const results: SearchResult[] = [];
  const chat = chats.find(c => c.id === chatId);
  const chatName = chat?.name || "当前对话";
  const messages = msgs[chatId] || [];

  for (const msg of messages) {
    if (msg.isSystem) continue;
    const lc = msg.content.toLowerCase();
    const matchedKw = keywords.find(kw => lc.includes(kw.toLowerCase()));
    if (!matchedKw) continue;
    // 敏感信息检测
    const isSensitive = /账号|密码|password|token|身份证|手机号|银行卡/i.test(msg.content);
    results.push({
      msgId: msg.id,
      chatId,
      chatName,
      sender: msg.sender,
      content: isSensitive ? "[🔒 敏感消息] 含账号/密码相关信息" : msg.content.slice(0, 60),
      time: msg.time,
      isSensitive,
      matchedKeyword: matchedKw,
      date: msg.date,
    });
  }
  return results;
}

// ══════════════════════════════════════════════════════════
// AI 追问回复
// ══════════════════════════════════════════════════════════
function aiFollowup(q:string,chatId:number):string{
  const lq=q.toLowerCase();
  if(lq.includes("重庆")||lq.includes("火锅")||lq.includes("洪崖洞"))return `🌶️ **重庆游玩推荐**\n\n**第一天（5/10）：**\n• 中午抵达后吃火锅（推荐：朱光玉、珮姐）\n• 下午：洪崖洞观景\n• 晚上：千厮门大桥夜景\n\n**第二天（5/11）：**\n• 上午：磁器口古镇\n• 下午：李子坝轻轨穿楼`;
  if(lq.includes("互动游戏")||lq.includes("17分钟")||lq.includes("互动时长"))return `🎮 **Q仔关于互动时长的建议**\n\n折中方案：**17分钟**，三轮结构：\n• 第1轮·个人闯关（5分钟）：10题历史知识，保持紧凑\n• 第2轮·队伍抢答（7分钟）：6支队，主持人掌握节奏\n• 第3轮·团队协作（≤5分钟）：可根据现场状态灵活缩短\n\n主持人提前设计「快节奏版」和「完整版」两套脚本，现场随机应变。这样既保留了陈晓雨想要的完整体验，也降低了你担心的冷场风险。`;
  if(lq.includes("嘉宾")||lq.includes("校外")||lq.includes("赞助"))return `💡 **Q仔关于嘉宾邀请的建议**\n\n主方案（稳妥）：不依赖校外嘉宾，由校内学长学姐或老师担任点评嘉宾，零成本。\n\n备选方案（争取）：同步联系学院创业中心，若获得额外赞助则邀请校外嘉宾升级执行。\n\n这样两个方案的建议可以同步进行，主方案不受影响，备选方案成则加分。`;
  if(lq.includes("ddl")||lq.includes("截止"))return `⏰ **近期DDL**\n\n🔴 紧急（一周内）：\n• 创新赛初赛 → 5月6日\n• 计网作业 → 5月6日\n\n🟡 待关注：\n• 数据结构实验 → 5月15日\n• 操作系统答辩 → 5月7日`;
  if(lq.includes("谁对")||lq.includes("谁正确"))return `⚖️ **客观分析**\n\n两人都有合理之处：\n• 陈晓雨诉求合理：互动环节是高光，时间充足才有效果\n• 你的考虑合理：节奏控制是晚会质量的关键\n\n这是「完整体验」vs「节奏控制」的优先级分歧，不是谁对谁错。折中17分钟+灵活预案是合理解法。`;
  const chat=CHATS.find(c=>c.id===chatId);
  return `我理解你问的是「${q}」。基于「${chat?.name||"当前对话"}」，我可以帮你总结、提醒DDL、给行动建议。`;
}

function partnerFirstMsg(chatId:number):string{
  const m:Record<number,string>={
    20:"我看了 Q仔 的分析……互动时长那块，我承认我说「你保守」有点冲动，但20分钟的理由我还是想再解释一下",
    21:"……我看了。Q仔说的「沟通时多用我感觉而非你总是」这点，我确实做得不太好",
    13:"我也看完了！Q仔说航班可能延误，我们要提前出门吗",
  };
  return m[chatId]||"";
}

function getReminderStyles(event:ScheduleEvent){
  const title=event.title;
  const dl=`${event.date.slice(5).replace("-","/")} ${event.startTime}`;
  return [
    {label:"温柔学姐风",icon:"🌸",text:`亲爱的，「${title}」快到啦哦～（${dl}），记得提前准备，加油你可以的！🌸`},
    {label:"毒舌室友风",icon:"😤",text:`喂！「${title}」，${dl}，你确定你准备好了？！别到时候哭哭啼啼说来不及！😤`},
    {label:"佛系朋友风",icon:"🧘",text:`嗯……「${title}」好像快了……（${dl}）……随缘吧……但……还是……做一下？🧘`},
    {label:"正经班委风",icon:"📋",text:`[提醒] 「${title}」时间节点为 ${dl}，请按时完成，不接受事后补交。`},
  ];
}

function computeSendTime(opt:"1h"|"3h"|"custom",custom:string,ev:ScheduleEvent|null):string{
  if(opt==="custom")return custom;
  if(!ev)return opt==="1h"?"23:00":"21:00";
  const endH=parseInt(ev.endTime.split(":")[0]);
  const base=endH>=23?24:endH;
  const h=Math.max(0,base-(opt==="1h"?1:3));
  return `${h.toString().padStart(2,"0")}:00`;
}

function addDays(base:string,n:number){const d=new Date(base);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function formatDate(d:string){const months=["一","二","三","四","五","六","七","八","九","十","十一","十二"];const[,m,day]=d.split("-");return `${months[parseInt(m)-1]}月${parseInt(day)}日`;}
function getDayName(d:string){const days=["日","一","二","三","四","五","六"];return "周"+days[new Date(d).getDay()];}
function extractDDL(content:string):Partial<ScheduleEvent>|null{
  const hasKw=["截止","DDL","ddl","提交"].some(k=>content.includes(k));
  const dateM=content.match(/(\d{1,2})月(\d{1,2})日/);
  const timeM=content.match(/(\d{1,2}):(\d{2})/);
  if(!hasKw&&!dateM)return null;
  let date=TODAY;
  if(dateM){const m=parseInt(dateM[1]).toString().padStart(2,"0");const d2=parseInt(dateM[2]).toString().padStart(2,"0");date=`2026-${m}-${d2}`;}
  return {date,startTime:timeM?timeM[0]:"23:59",endTime:timeM?timeM[0]:"23:59",type:"task",color:"#FFE7BA",priority:"high"};
}
function filterCaps(caps:Capsule[],f:CapsuleFilter){
  if(f==="all")return caps;
  if(f==="event")return caps.filter(c=>c.type!=="confirmed"&&c.type!=="plan"&&c.type!=="sensitive");
  if(f==="conflict")return caps.filter(c=>c.type==="conflict");
  if(f==="confirmed")return caps.filter(c=>c.type==="confirmed");
  if(f==="week")return caps.filter(c=>c.createdAt===TODAY||c.new);
  if(f==="info")return caps.filter(c=>c.type==="plan"||c.type==="sensitive");
  return caps;
}
const EF:EventForm={title:"",date:TODAY,startTime:"09:00",endTime:"10:00",location:"",type:"class",priority:"medium"};
const colorMap:Record<string,string>={class:"#E3F2FD",task:"#FFE7BA",event:"#F0FFF4",exam:"#FFF0F6",travel:"#E6FFFB"};

// ══════════════════════════════════════════════════════════
// AI 推理理由生成
// ══════════════════════════════════════════════════════════
const getAiReason = (title: string, level: string, from?: string): string => {
  if(title.includes("计网")||title.includes("第三章")||title.includes("作业补充"))
    return "张老师本学期已发出3次DDL提醒，本次措辞紧迫度↑ · 距截止仅7天 · 同期有3项任务竞争时间";
  if(title.includes("创新赛")||title.includes("初赛"))
    return "初赛截止与计网同天5月6日 · PPT v3待优化 · Q仔建议今晚计网优先，明日专注此项";
  if(title.includes("操作系统")||title.includes("答辩"))
    return "需现场答辩 · 机房405 · 占用完整下午时段，不可缺席";
  if(title.includes("组会")||title.includes("腾讯会议"))
    return "翁老师重视过程展示 · 今日16:30线上 · 缺席需提前告知";
  if(title.includes("冲突"))
    return "两个必须级事项时间重叠 · 建议优先确认可退出的一方，再通知另一方";
  if(title.includes("账号")||title.includes("密码")||title.includes("敏感"))
    return "隐私信息已本地AES-256加密 · 云端仅存指针 · 仅你可见，他人无法访问";
  if(title.includes("班费")||title.includes("团建"))
    return "班级活动 · 可协商 · Q仔判断不影响学业核心任务";
  if(level==="已确认") return "已写入日程，Q仔将在截止前按你偏好风格自动提醒";
  if(level==="方案参考") return "来自群讨论总结，供规划参考，无需强制确认";
  return "综合事件类型、截止远近与本周任务密度判断";
};

// ══════════════════════════════════════════════════════════
// 以下是主组件（Part 2 继续）
// 此处为 Part 1 结束标记，Part 2 从 export default function QCapsuleDemo(){ 开始
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// PART 2：主组件函数（State + Effects + Handlers + 计算量）
// 拼接时放在 Part1 末尾（helpers结束）之后，Part3（return JSX）之前
// ══════════════════════════════════════════════════════════

export default function QCapsuleDemo(){

  // ────────────────────────────────────────────────────────
  // 原有 State（保持不变）
  // ────────────────────────────────────────────────────────
  const [activeChat,       setActiveChat]       = useState(2);
  const [messages,         setMessages]         = useState(MSGS);
  const [capsules,         setCapsules]         = useState<Capsule[]>(INIT_CAPS);
  const [schedule,         setSchedule]         = useState<ScheduleEvent[]>(INIT_SCH);
  const [unreadMap,        setUnreadMap]        = useState<Record<number,number>>(()=>Object.fromEntries(CHATS.map(c=>[c.id,c.unread])));
  const [newCapIds,        setNewCapIds]        = useState<number[]>([101,102,103,105,106]);
  const [flyingCap,        setFlyingCap]        = useState<number|null>(null);
  const [toast,            setToast]            = useState<{msg:string;color:string}|null>(null);
  // rightTab 类型已扩展为 RightTab（含 "cross"）
  const [rightTab,         setRightTab]         = useState<RightTab>("schedule");
  const [searchKw,         setSearchKw]         = useState("");
  const [reminderEv,       setReminderEv]       = useState<ScheduleEvent|null>(null);
  const [selStyle,         setSelStyle]         = useState(1);
  const [sentReminder,     setSentReminder]     = useState(false);
  const [aiVisible,        setAiVisible]        = useState(false);
  const [aiChatId,         setAiChatId]        = useState<number|null>(null);
  const [aiMessages,       setAiMessages]       = useState<AiMsg[]>([]);
  const [aiInput,          setAiInput]          = useState("");
  const [aiLoading,        setAiLoading]        = useState(false);
  const [ctxMenu,          setCtxMenu]          = useState<CtxMenu>(null);
  const [schDate,          setSchDate]          = useState(TODAY);
  const [weekStart,        setWeekStart]        = useState(TODAY);
  const [showEvModal,      setShowEvModal]      = useState(false);
  const [editingEv,        setEditingEv]        = useState<ScheduleEvent|null>(null);
  const [evForm,           setEvForm]           = useState<EventForm>(EF);
  const [capFilter,        setCapFilter]        = useState<CapsuleFilter>("all");
  const [showLegend,       setShowLegend]       = useState(false);
  const [showPriorityLegend,setShowPriorityLegend] = useState(false);
  const [selectMode,       setSelectMode]       = useState(false);
  const [selMsgIds,        setSelMsgIds]        = useState<Set<number>>(new Set());
  const [sharedMode,       setSharedMode]       = useState<SharedMode>(null);
  const [highlightId,      setHighlightId]      = useState<number|null>(null);   // 日程高亮
  const [groupSchedM,      setGroupSchedM]      = useState<{chatId:number}|null>(null);
  const [sensitiveCapId,   setSensitiveCapId]   = useState<number|null>(null);
  const [sensitiveInput,   setSensitiveInput]   = useState("");
  const [unlockedCaps,     setUnlockedCaps]     = useState<Set<number>>(new Set());
  const [reminderConfig,   setReminderConfig]   = useState<{styleIdx:number;sendTime:string;evId:number;evTitle:string}|null>(null);
  const [reminderTimeOpt,  setReminderTimeOpt]  = useState<"1h"|"3h"|"custom">("3h");
  const [reminderCustomT,  setReminderCustomT]  = useState("21:00");
  const [timeJumped,       setTimeJumped]       = useState(false);
  const [alertBanner,      setAlertBanner]      = useState(false);
  const [priorityDone,     setPriorityDone]     = useState<Set<string>>(new Set());
  const [demoBarPos,       setDemoBarPos]       = useState<{x:number;y:number}>({x:320,y:16});
  const [demoBarDrag,      setDemoBarDrag]      = useState<{startX:number;startY:number;origX:number;origY:number}|null>(null);
  const [showImportModal,  setShowImportModal]  = useState(false);
  const [importStep,       setImportStep]       = useState<"choose"|"loading"|"done">("choose");
  const [importMethod,     setImportMethod]     = useState<string>("");
  const [flightModal,      setFlightModal]      = useState<string|null>(null);
  const [travelMonitor,    setTravelMonitor]    = useState(false);
  const [aiCtxMenu,        setAiCtxMenu]        = useState<{x:number;y:number;content:string}|null>(null);
  const [priorityOverrides,setPriorityOverrides]= useState<Record<string,string>>({});
  const [editingPItem,     setEditingPItem]     = useState<{id:string;title:string;level:string;desc:string}|null>(null);
  const [aiLearnLog,       setAiLearnLog]       = useState<{from:string;to:string;title:string;time:string}[]>([]);
  const [reminderStyleCounts,setReminderStyleCounts] = useState<Record<number,number>>({...PROFILE_DATA.remindStyleHistory});
  const [captureLog,       setCaptureLog]       = useState<{title:string;time:string}[]>([]);

  // ────────────────────────────────────────────────────────
  // 新增 State
  // ────────────────────────────────────────────────────────

  // 【模块一·智能检索】
  const [showSearchPanel,  setShowSearchPanel]  = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [searchMode,       setSearchMode]       = useState<"normal"|"smart">("smart");
  const [aiKeywords,       setAiKeywords]       = useState<string[]>([]);
  const [keywordLoading,   setKeywordLoading]   = useState(false);
  const [searchResults,    setSearchResults]    = useState<SearchResult[]>([]);
  const [highlightMsgId,   setHighlightMsgId]   = useState<number|null>(null);  // 聊天消息高亮
  const [searchDone,       setSearchDone]       = useState(false);

  // 【模块二·智能排期】
  const [monitoredGroups,  setMonitoredGroups]  = useState<Set<number>>(new Set(DEFAULT_MONITORED_GROUPS));
  const [showGroupSetup,   setShowGroupSetup]   = useState(false);
  const [setupGroupId,     setSetupGroupId]     = useState<number|null>(null);
  const [learningLog,      setLearningLog]      = useState<LearningEntry[]>(INIT_LEARNING_LOG);
  const [showConflictSuggest, setShowConflictSuggest] = useState(false);
  const [conflictSuggestion,  setConflictSuggestion]  = useState<{capId:number;keep:string;cancel:string;reason:string}|null>(null);
  const [showTeacherEvidence, setShowTeacherEvidence] = useState<string|null>(null); // 展示哪位老师的推断来源
  const [groupCtxMenu,    setGroupCtxMenu]     = useState<{x:number;y:number;chatId:number}|null>(null);

  // 【跨群分析 Tab】
  const [crossMessages,    setCrossMessages]    = useState<AiMsg[]>([
    {role:"ai", content: CROSS_ANALYSIS_INTRO}
  ]);
  const [crossInput,       setCrossInput]       = useState("");
  const [crossLoading,     setCrossLoading]     = useState(false);

  // ────────────────────────────────────────────────────────
  // Refs
  // ────────────────────────────────────────────────────────
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const aiEndRef     = useRef<HTMLDivElement>(null);
  const crossEndRef  = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ────────────────────────────────────────────────────────
  // Effects
  // ────────────────────────────────────────────────────────
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages,activeChat]);
  useEffect(()=>{aiEndRef.current?.scrollIntoView({behavior:"smooth"});},[aiMessages,aiLoading]);
  useEffect(()=>{crossEndRef.current?.scrollIntoView({behavior:"smooth"});},[crossMessages,crossLoading]);

  // 关闭所有右键菜单
  useEffect(()=>{
    const fn=()=>{setCtxMenu(null);setAiCtxMenu(null);setGroupCtxMenu(null);};
    window.addEventListener("click",fn);
    return()=>window.removeEventListener("click",fn);
  },[]);

  // 切换聊天时清空多选
  useEffect(()=>{setSelectMode(false);setSelMsgIds(new Set());},[activeChat]);

  // 关闭搜索面板时清空状态
  useEffect(()=>{
    if(!showSearchPanel){setSearchQuery("");setAiKeywords([]);setSearchResults([]);setKeywordLoading(false);setSearchDone(false);}
    else{setTimeout(()=>searchInputRef.current?.focus(),100);}
  },[showSearchPanel]);

  // Demo 控制条拖拽
  useEffect(()=>{
    if(!demoBarDrag)return;
    const onMove=(e:MouseEvent)=>{
      const dx=e.clientX-demoBarDrag.startX;
      const dy=e.clientY-demoBarDrag.startY;
      setDemoBarPos({x:Math.max(0,demoBarDrag.origX+dx),y:Math.max(0,demoBarDrag.origY-dy)});
    };
    const onUp=()=>setDemoBarDrag(null);
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
    return()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
  },[demoBarDrag]);

  // ────────────────────────────────────────────────────────
  // 工具函数
  // ────────────────────────────────────────────────────────
  const showToast=(msg:string,color="#52C41A")=>{setToast({msg,color});setTimeout(()=>setToast(null),2800);};

  // AI推荐的提醒风格（响应次数最多的）
  const aiRecommendedStyleIdx = (()=>{
    const entries = Object.entries(reminderStyleCounts) as [string,number][];
    return parseInt(entries.sort((a,b)=>b[1]-a[1])[0][0]);
  })();
  const totalStyleUses = Object.values(reminderStyleCounts).reduce((s,v)=>s+v,0);

  // ────────────────────────────────────────────────────────
  // 【模块一·智能检索】Handlers
  // ────────────────────────────────────────────────────────

  /** 执行智能检索：关键词动态生成 → 消息匹配 → 展示结果 */
  const handleSmartSearch = () => {
    if(!searchQuery.trim()) return;
    setAiKeywords([]);
    setSearchResults([]);
    setSearchDone(false);
    setKeywordLoading(true);

    const kws = expandKeywords(searchQuery);
    // 逐个动画显示关键词
    kws.forEach((kw, i) => {
      setTimeout(()=>{
        setAiKeywords(p => [...p, kw]);
        if(i === kws.length - 1){
          setKeywordLoading(false);
          // 开始匹配
          const results = smartSearch(searchQuery, activeChat, CHATS, messages);
          setTimeout(()=>{setSearchResults(results);setSearchDone(true);}, 300);
        }
      }, 180 * (i + 1));
    });
  };

  /** 点击搜索结果：跳转 + 高亮目标消息 */
  const handleSearchResultClick = (result: SearchResult) => {
    setShowSearchPanel(false);
    // 若是敏感消息，跳转后自动触发密码验证提示
    if(result.chatId !== activeChat){
      setActiveChat(result.chatId);
      setUnreadMap(p=>({...p,[result.chatId]:0}));
    }
    // 高亮目标消息 3 秒
    setTimeout(()=>{
      setHighlightMsgId(result.msgId);
      setTimeout(()=>setHighlightMsgId(null), 3000);
      // 如果是敏感消息，额外弹出密码验证提示
      if(result.isSensitive){
        setTimeout(()=>showToast("🔒 Q仔提醒：此消息含敏感信息，点击消息输入密码 666 解锁", "#8C8C8C"), 400);
      }
    }, 200);
  };

  /** Demo 按钮：一键触发智能检索演示 */
  const simSmartSearch = () => {
    setActiveChat(3); // 切到张师兄
    setUnreadMap(p=>({...p,3:0}));
    setTimeout(()=>{
      setShowSearchPanel(true);
      setSearchMode("smart");
      setTimeout(()=>{
        setSearchQuery("教务系统密码是什么");
        setTimeout(()=>handleSmartSearch(), 300);
      }, 500);
    }, 400);
  };

  // ────────────────────────────────────────────────────────
  // 【模块二·智能排期】Handlers
  // ────────────────────────────────────────────────────────

  /** 打开某个群的 Q仔 权限设置 */
  const openGroupSetup = (chatId: number) => {
    setGroupCtxMenu(null);
    setSetupGroupId(chatId);
    setShowGroupSetup(true);
  };

  /** 切换群监听状态 */
  const toggleMonitor = (chatId: number) => {
    setMonitoredGroups(p => {
      const n = new Set(p);
      if(n.has(chatId)){n.delete(chatId);}else{n.add(chatId);}
      return n;
    });
  };

  /** 保存群权限设置 */
  const saveGroupSetup = () => {
    const chat = CHATS.find(c=>c.id===setupGroupId);
    const isOn = monitoredGroups.has(setupGroupId||0);
    setShowGroupSetup(false);
    showToast(isOn ? `✅ Q仔 已开始监听「${chat?.name}」` : `⏸️ Q仔 已停止监听「${chat?.name}」`, isOn?"#52C41A":"#8C8C8C");
  };

  /** Demo 按钮：群权限设置演示（预置课程群）*/
  const simGroupSetup = () => {
    setActiveChat(4);
    setUnreadMap(p=>({...p,4:0}));
    setTimeout(()=>{
      // 确保课程群已监听（演示开始时先展示开启流程）
      if(!monitoredGroups.has(4)){
        setSetupGroupId(4);
        setShowGroupSetup(true);
      } else {
        showToast("📡 计算机网络群已在 Q仔 监听范围内", "#1677FF");
        setTimeout(()=>simDDL(), 1000);
      }
    }, 300);
  };

  /** Demo 按钮：自动抓取 DDL 演示（含学习日志更新）*/
  const simDDL = () => {
    setActiveChat(4);
    setUnreadMap(p=>({...p,4:0}));
    setTimeout(()=>setMessages(p=>({...p,4:[...p[4],{id:Date.now(),sender:"张老师",content:"再次补充：作业5月6日23:59截止，双平台提交，不接受补交！",time:"22:05",self:false}]})), 400);
    setTimeout(()=>{
      const cap:Capsule={
        id:Date.now(),type:"pending",importance:"high",
        group:"计算机网络 · 课程群",
        title:"📎 作业补充要求",
        content:"学习通也要交！5/6 23:59 截止，不接受补交",
        time:"22:05",from:"张老师",new:true,createdAt:TODAY,
        scheduleData:{date:"2026-05-06",startTime:"23:00",endTime:"23:59",title:"📎 计网作业截止",type:"task",color:"#FFE7BA",priority:"high"},
      };
      setCapsules(p=>[cap,...p]);
      setNewCapIds(p=>[cap.id,...p]);
      setFlyingCap(cap.id);
      setRightTab("capsule");
      setTimeout(()=>setFlyingCap(null),800);
      showToast("🟡 Q仔自动识别：张老师第3次DDL提醒，紧迫度↑","#FA8C16");
    }, 1100);
  };

  /** 点击冲突代办 → 弹出 Q仔 建议弹窗 */
  const openConflictSuggest = (cap: Capsule) => {
    // 预置冲突建议内容
    setConflictSuggestion({
      capId: cap.id,
      keep:   "创新赛内部评审（周六 14:30）",
      cancel: "摄影社外拍（周六 14:00·情人谷）",
      reason: "根据你过去 3 次冲突时的选择记录，竞赛类优先级高于社团活动。摄影社外拍可协商请假，创新赛评审不可缺席。",
    });
    setShowConflictSuggest(true);
  };

  /** 接受 Q仔 冲突建议 */
  const handleConflictAccept = () => {
    if(!conflictSuggestion) return;
    // 删除冲突代办
    setCapsules(p=>p.filter(c=>c.id!==conflictSuggestion.capId));
    setNewCapIds(p=>p.filter(i=>i!==conflictSuggestion.capId));
    // 写入学习日志
    const now = new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    setLearningLog(p=>[
      {type:"preference-update",icon:"⬆️",time:now,content:`冲突解决：保留「${conflictSuggestion.keep}」→ 竞赛优先级记录 +1`},
      ...p
    ]);
    setShowConflictSuggest(false);
    setConflictSuggestion(null);
    showToast("✅ 已接受建议，日程已更新，Q仔已记录你的偏好","#52C41A");
  };

  /** 跨群分析 Tab：发送问题 */
  const sendCrossAnalysis = (text?: string) => {
    const q = text || crossInput.trim();
    if(!q) return;
    setCrossMessages(p=>[...p,{role:"user",content:q}]);
    setCrossInput("");
    setCrossLoading(true);
    setTimeout(()=>{
      // 根据关键词选择预制回复
      let reply = CROSS_ANALYSIS_REPLIES.today;
      const lq = q.toLowerCase();
      if(lq.includes("这周")||lq.includes("本周")||lq.includes("一周")) reply = CROSS_ANALYSIS_REPLIES.week;
      else if(lq.includes("危险")||lq.includes("最紧")||lq.includes("最急")) reply = CROSS_ANALYSIS_REPLIES.danger;
      else if(lq.includes("今天")||lq.includes("今日")||lq.includes("今晚")) reply = CROSS_ANALYSIS_REPLIES.today;
      setCrossMessages(p=>[...p,{role:"ai",content:reply}]);
      setCrossLoading(false);
    }, 1200);
  };

  /** Demo 按钮：跨群分析演示 */
  const simCrossAnalysis = () => {
    setRightTab("cross");
    setTimeout(()=>{
      sendCrossAnalysis("我今天应该做什么？");
    }, 500);
  };

  // ────────────────────────────────────────────────────────
  // 【模块三·协作分析】Handlers
  // ────────────────────────────────────────────────────────

  /** Demo 按钮：切换到陈晓雨聊天 + 开启多选 + 预选争议消息段 */
  const simCollabAnalysis = () => {
    setActiveChat(20);
    setUnreadMap(p=>({...p,20:0}));
    setAiVisible(false);
    setTimeout(()=>{
      setSelectMode(true);
      // 预选 id 9-32 的消息（争议段）
      const disputeMsgIds = new Set(
        (messages[20]||[])
          .filter(m=>m.id>=9&&m.id<=32)
          .map(m=>m.id)
      );
      setSelMsgIds(disputeMsgIds);
      showToast("☑️ 已选中争议消息段（22条），点击「AI分析」开始分析","#36CFC9");
    }, 400);
  };

  // ────────────────────────────────────────────────────────
  // 原有 Handlers（保持逻辑，部分微调）
  // ────────────────────────────────────────────────────────

  const handleSelectChat = (id:number) => {
    setActiveChat(id);
    setUnreadMap(prev=>({...prev,[id]:0}));
    if(aiChatId!==id) setAiVisible(false);
    setShowSearchPanel(false);
  };

  const openAI = useCallback((chatId:number, prefill?:string) => {
    setAiChatId(chatId);setAiVisible(true);setAiInput("");setSharedMode(null);
    if(aiChatId!==chatId){
      setAiMessages([]);setAiLoading(true);
      setTimeout(()=>{
        const sum = AI_SUM[chatId] || `📋 **对话总结**\n\n基于「${CHATS.find(c=>c.id===chatId)?.name}」的内容分析。`;
        setAiMessages([{role:"ai",content:sum}]);setAiLoading(false);
        if(prefill){
          setTimeout(()=>{
            setAiMessages(p=>[...p,{role:"user",content:prefill}]);setAiLoading(true);
            setTimeout(()=>{setAiMessages(p=>[...p,{role:"ai",content:aiFollowup(prefill,chatId)}]);setAiLoading(false);},800);
          },400);
        }
      },1000);
    } else if(prefill){
      setAiMessages(p=>[...p,{role:"user",content:prefill}]);setAiLoading(true);
      setTimeout(()=>{setAiMessages(p=>[...p,{role:"ai",content:aiFollowup(prefill,chatId)}]);setAiLoading(false);},800);
    }
  },[aiChatId]);

  const sendAI = (text?:string) => {
    const q=text||aiInput.trim();if(!q)return;
    setAiMessages(p=>[...p,{role:"user",content:q}]);setAiInput("");setAiLoading(true);
    setTimeout(()=>{setAiMessages(p=>[...p,{role:"ai",content:aiFollowup(q,aiChatId||activeChat)}]);setAiLoading(false);},900);
  };

  const handleShareAI = () => {
    const chat=CHATS.find(c=>c.id===aiChatId);
    if(!chat||chat.type!=="private")return;
    setSharedMode({chatId:aiChatId!,partnerName:chat.name,partnerColor:chat.color});
    showToast(`🤝 已共享给 ${chat.name}，对方正在查看...`,"#7B68EE");
    setTimeout(()=>{
      setAiMessages(p=>[...p,{role:"ai",content:`🤝 **协作模式已开启**\n\n**${chat.name}** 已加入对话，双方均可追问 Q仔。`}]);
      const pm=partnerFirstMsg(aiChatId!);
      if(pm){
        setTimeout(()=>{
          setAiMessages(p=>[...p,{role:"partner",content:pm,sender:chat.name}]);
          setAiLoading(true);
          setTimeout(()=>{
            setAiMessages(p=>[...p,{role:"ai",content:aiFollowup(pm,aiChatId!)}]);
            setAiLoading(false);
          },1000);
        },1500);
      }
    },800);
  };

  const toggleSelectMode = () => {setSelectMode(p=>!p);setSelMsgIds(new Set());};
  const toggleMsgSel = (id:number) => setSelMsgIds(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});

  // 多选 AI 分析（模块三核心入口）
  const MULTI_CTX:Record<number,string>={
    13:"这是我和小美讨论重庆出行的对话。请帮我总结：1.出行时间和方式 2.航班和酒店信息 3.行程建议",
    20:"【协作分析】这是我和陈晓雨讨论五四晚会方案的对话，中间产生了争执。请客观分析：核心分歧、情绪信号、已达成共识、折中建议。",
    21:"这是我和室友的矛盾对话。请客观分析",
    3:"这是我和师兄的私聊。请帮我总结",
  };
  const handleMultiAI = () => {
    const msgs=(messages[activeChat]||[]).filter(m=>selMsgIds.has(m.id)&&!m.isSystem);
    if(!msgs.length)return;
    const content=msgs.map(m=>`[${m.self?"我":m.sender}]: ${m.content}`).join("\n");
    const ctx=MULTI_CTX[activeChat]||"请帮我提炼核心信息";
    const q=`【选中了 ${msgs.length} 条消息】\n\n${ctx}\n\n---\n${content.slice(0,700)}`;
    setSelectMode(false);setSelMsgIds(new Set());
    openAI(activeChat,q);
  };

  const handleCM = (e:React.MouseEvent,msg:Message,cid:number) => {
    e.preventDefault();e.stopPropagation();
    setGroupCtxMenu(null);
    setCtxMenu({x:e.clientX,y:e.clientY,msg,cid});
  };

  // 群聊列表右键（新增）
  const handleGroupCM = (e:React.MouseEvent,chatId:number) => {
    const chat = CHATS.find(c=>c.id===chatId);
    if(chat?.type!=="group") return;
    e.preventDefault();e.stopPropagation();
    setCtxMenu(null);
    setGroupCtxMenu({x:e.clientX,y:e.clientY,chatId});
  };

  const handleAIMsg = (msg:Message,cid:number) => {
    setCtxMenu(null);
    openAI(cid,`请帮我分析这条消息：\n\n"${msg.content.slice(0,200)}"`);
    setActiveChat(cid);
    setUnreadMap(p=>({...p,[cid]:0}));
  };

  const handleDDL = (msg:Message,cid:number) => {
    setCtxMenu(null);
    const isSensitive=/账号|密码|password|用户名|token/i.test(msg.content);
    const sched=isSensitive?null:extractDDL(msg.content);
    const chat=CHATS.find(c=>c.id===cid);
    const cap:Capsule={
      id:Date.now(),
      type:isSensitive?"sensitive":sched?"pending":"plan",
      importance:isSensitive?"high":sched?"high":"low",
      group:chat?.name||"",
      title:isSensitive?`🔐 ${chat?.name||"私聊"} · 账号密码`:`📎 ${msg.content.slice(0,25)}…`,
      content:isSensitive?`账号：****　密码：****\n（${chat?.name||"私聊"}）\n🔒 点击输入密码 666 查看完整内容`:msg.content.slice(0,120),
      rawContent:isSensitive?msg.content:undefined,
      time:msg.time,from:msg.sender,new:true,createdAt:TODAY,
      scheduleData:sched||undefined,
    };
    setCapsules(p=>[cap,...p]);setNewCapIds(p=>[cap.id,...p]);setFlyingCap(cap.id);setRightTab("capsule");
    setTimeout(()=>setFlyingCap(null),800);
    // 写入学习日志
    const now=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    setCaptureLog(p=>[{title:cap.title.slice(0,20),time:now},...p].slice(0,10));
    if(!isSensitive){
      setLearningLog(p=>[
        {type:"manual-add" as const,icon:"📝",time:now,content:`手动抓取「${cap.title.slice(0,18)}」→ 已记入：${chat?.name||""}的相关内容将提高识别权重`},
        ...p
      ].slice(0,15));
    }
    showToast(isSensitive?"⚫ 敏感信息已加密抓取，需密码 666 解锁":sched?"🟡 已抓取为代办，Q仔已记录你的习惯":"🔵 已提取为参考代办",isSensitive?"#8C8C8C":sched?"#FA8C16":"#3B82F6");
  };

  const handleEnterSel = (msg:Message,cid:number) => {
    setCtxMenu(null);
    if(activeChat!==cid){setActiveChat(cid);setUnreadMap(p=>({...p,[cid]:0}));}
    setSelectMode(true);setSelMsgIds(new Set([msg.id]));
    showToast("☑️ 多选模式已开启","#4A90D9");
  };

  const openAddEv = () => {setEditingEv(null);setEvForm({...EF,date:schDate});setShowEvModal(true);};
  const openEditEv = (ev:ScheduleEvent) => {
    setEditingEv(ev);
    setEvForm({title:ev.title,date:ev.date,startTime:ev.startTime,endTime:ev.endTime,location:ev.location||"",type:ev.type,priority:ev.priority||"medium"});
    setShowEvModal(true);
  };
  const saveEv = () => {
    if(!evForm.title.trim())return;
    if(editingEv){
      setSchedule(p=>p.map(e=>e.id===editingEv.id?{...e,...evForm,location:evForm.location||undefined,color:colorMap[evForm.type]||e.color}:e));
      setSchDate(evForm.date);showToast("✅ 日程已更新");
    } else {
      const nev:ScheduleEvent={id:Date.now(),...evForm,location:evForm.location||undefined,color:colorMap[evForm.type]||"#E3F2FD"};
      setSchedule(p=>[...p,nev]);setSchDate(evForm.date);showToast("✅ 日程已添加");
    }
    setShowEvModal(false);
  };
  const deleteEv = (id:number) => {setSchedule(p=>p.filter(e=>e.id!==id));showToast("🗑️ 日程已删除","#8C8C8C");};

  const handleImport = (method:string) => {
    setImportMethod(method);setImportStep("loading");
    setTimeout(()=>{
      setImportStep("done");
      const importedEvs:ScheduleEvent[]=[
        {id:Date.now()+1,date:"2026-04-29",startTime:"08:00",endTime:"09:50",title:"📥 数据库原理",   location:"逸A-301",type:"class",color:"#E8EAF6",priority:"medium"},
        {id:Date.now()+2,date:"2026-04-30",startTime:"08:00",endTime:"09:50",title:"📥 软件工程",     location:"逸A-205",type:"class",color:"#E8EAF6",priority:"medium"},
        {id:Date.now()+3,date:"2026-05-04",startTime:"10:10",endTime:"12:00",title:"📥 编译原理",     location:"逸B-108",type:"class",color:"#E8EAF6",priority:"medium"},
        {id:Date.now()+4,date:"2026-05-05",startTime:"14:00",endTime:"15:50",title:"📥 人工智能导论", location:"逸C-202",type:"class",color:"#E8EAF6",priority:"medium"},
      ];
      setSchedule(p=>[...p,...importedEvs]);
      showToast(`✅ 通过${method}成功导入 ${importedEvs.length} 节课程`,"#52C41A");
    },1800);
  };

  const confirmCap = (id:number) => {
    const cap=capsules.find(c=>c.id===id);
    setCapsules(p=>p.map(c=>c.id===id?{...c,type:"confirmed",new:false}:c));
    setNewCapIds(p=>p.filter(i=>i!==id));
    if(cap?.scheduleData){
      const nid=Date.now();
      const ev:ScheduleEvent={id:nid,date:cap.scheduleData.date||TODAY,startTime:cap.scheduleData.startTime||"09:00",endTime:cap.scheduleData.endTime||"10:00",title:cap.scheduleData.title||cap.title,location:cap.scheduleData.location,type:cap.scheduleData.type||"task",color:cap.scheduleData.color||"#FFE7BA",priority:cap.scheduleData.priority||"medium",fromCapsule:true,groupName:cap.group};
      setSchedule(p=>{const ex=p.some(e=>e.title===ev.title&&e.date===ev.date);return ex?p:[...p,ev];});
      setSchDate(ev.date);setRightTab("schedule");
      setTimeout(()=>setHighlightId(nid),200);setTimeout(()=>setHighlightId(null),3000);
      showToast("✅ 已确认，跳转至日程表","#52C41A");
    } else {showToast("✅ 代办已确认","#52C41A");}
    // 写入学习日志
    const now=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    if(cap?.importance==="high"){
      setLearningLog(p=>[{type:"preference-update" as const,icon:"⬆️",time:now,content:`确认高优先级代办「${cap.title.slice(0,15)}」→ 同类事件优先级权重 +1`},...p].slice(0,15));
    }
  };

  const dismissCap = (id:number) => {
    const cap=capsules.find(c=>c.id===id);
    setCapsules(p=>p.filter(c=>c.id!==id));setNewCapIds(p=>p.filter(i=>i!==id));
    showToast("已忽略该代办","#8C8C8C");
    // 写入学习日志
    if(cap){
      const now=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
      setLearningLog(p=>[{type:"ignore" as const,icon:"🚫",time:now,content:`忽略「${cap.title.slice(0,15)}」→ 同类信息优先级降低`},...p].slice(0,15));
    }
  };

  const captureAIContent = (content:string) => {
    setAiCtxMenu(null);
    const cap:Capsule={
      id:Date.now(),type:"plan",importance:"low",
      group:"Q仔 AI总结",
      title:`🔵 AI总结 · ${content.slice(0,20)}…`,
      content:content.slice(0,300),
      time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}),
      from:"Q仔 AI",new:true,createdAt:TODAY,
    };
    setCapsules(p=>[cap,...p]);setNewCapIds(p=>[cap.id,...p]);setFlyingCap(cap.id);
    setRightTab("capsule");setCapFilter("info");
    setTimeout(()=>setFlyingCap(null),800);
    showToast("🔵 AI总结已抓取为方案参考","#3B82F6");
  };

  // 提醒快捷入口（从代办卡片小图标触发）
  const simReminderFromCap = (cap:Capsule) => {
    if(!cap.scheduleData?.date) return;
    const ev=schedule.find(e=>e.date===cap.scheduleData?.date&&(e.title.includes(cap.title.slice(2,10))||e.fromCapsule));
    if(ev){
      setReminderEv(ev);setSentReminder(false);setReminderTimeOpt("3h");
      setSelStyle(aiRecommendedStyleIdx);
    }
  };

  // 模拟时间推进（DDL 临近演示）
  const simTimeJump = () => {
    setTimeJumped(true);setAlertBanner(true);
    const ev=schedule.find(e=>e.date==="2026-05-06"&&e.title.includes("创新赛"));
    if(ev&&reminderConfig){
      showToast("⏰ Q仔自动提醒已发送至队友群","#7B68EE");
      setSentReminder(true);
    }
  };

  // ────────────────────────────────────────────────────────
  // 计算量
  // ────────────────────────────────────────────────────────
  const weekDays        = Array.from({length:7},(_,i)=>addDays(weekStart,i));
  const eventDates      = new Set(schedule.map(e=>e.date));
  const dayEvs          = schedule.filter(e=>e.date===schDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  const currentChat     = CHATS.find(c=>c.id===activeChat);
  const isPrivate       = currentChat?.type==="private";
  const filteredChats   = CHATS.filter(c=>!searchKw||c.name.toLowerCase().includes(searchKw.toLowerCase()));
  const pendingCount    = capsules.filter(c=>c.type==="pending"||c.type==="conflict").length;
  const totalUnread     = (Object.values(unreadMap) as number[]).reduce((s:number,v:number)=>s+v,0);
  const filteredCaps    = filterCaps(capsules,capFilter);
  const remStyles       = reminderEv?getReminderStyles(reminderEv):[];

  // 合并学习记录（优先级偏好树 + 捕获日志）
  const allLearnLog: LearningEntry[] = [
    ...learningLog,
    ...captureLog.map(l=>({type:"manual-add" as const,icon:"📝",time:l.time,content:`手动抓取「${l.title}」`})),
    ...aiLearnLog.map(l=>({type:"preference-update" as const,icon:"⬆️",time:l.time,content:`「${l.title.slice(0,12)}」优先级 ${l.from}→${l.to}`})),
  ].slice(0,15);

// ══════════════════════════════════════════════════════════
// PART 2 结束 — JSX return 从 Part3 开始
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// PART 3：完整 JSX（return 块）
// 拼接到 Part2 末尾（allLearnLog 计算量之后）
// ══════════════════════════════════════════════════════════

return (
  <div style={{display:"flex",height:"100vh",width:"100vw",background:"#F0F2F5",fontFamily:"'PingFang SC','Microsoft YaHei',sans-serif",overflow:"hidden",position:"relative",color:"#333"}}>

    {/* ── 强提醒 Banner ── */}
    {alertBanner&&(
      <div style={{position:"fixed",top:0,left:56,right:0,zIndex:5000,background:"linear-gradient(90deg,#FF4D4F,#FF7875)",color:"#fff",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 4px 20px rgba(255,77,79,0.5)"}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.25)",border:"2.5px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,flexShrink:0}}>!</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:800}}>⚡ 紧急：计算机网络第三章作业今日截止！</div>
          <div style={{fontSize:11.5,opacity:0.92,marginTop:1}}>截止时间：5月6日 23:59 · Word格式 ≥3000字 · 学习通 + 课程邮箱双提交</div>
        </div>
        <button onClick={()=>{setAiVisible(false);setRightTab("priority");}} style={{padding:"5px 12px",borderRadius:8,background:"rgba(255,255,255,0.2)",border:"1.5px solid rgba(255,255,255,0.6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>去优先级确认 →</button>
        <button onClick={()=>setAlertBanner(false)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.7)",fontSize:22,cursor:"pointer",padding:"0 4px",lineHeight:1,flexShrink:0}}>×</button>
      </div>
    )}

    {/* ── Toast ── */}
    {toast&&<div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 22px",borderRadius:24,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.18)"}}>{toast.msg}</div>}

    {/* ── 消息右键菜单 ── */}
    {ctxMenu&&(
      <div onClick={e=>e.stopPropagation()} style={{position:"fixed",left:ctxMenu.x,top:ctxMenu.y,background:"#fff",border:"1px solid #E5E8EE",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.14)",zIndex:9998,minWidth:165,overflow:"hidden"}}>
        {CHATS.find(c=>c.id===ctxMenu.cid)?.type==="private"&&(
          <>
            <div onClick={()=>handleEnterSel(ctxMenu.msg,ctxMenu.cid)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>☑️ 进入多选</div>
            <div style={{height:1,background:"#F0F0F0"}}/>
          </>
        )}
        <div onClick={()=>handleAIMsg(ctxMenu.msg,ctxMenu.cid)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>✨ AI总结此消息</div>
        <div style={{height:1,background:"#F0F0F0"}}/>
        <div onClick={()=>handleDDL(ctxMenu.msg,ctxMenu.cid)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>📎 抓取此内容</div>
        <div style={{height:1,background:"#F0F0F0"}}/>
        <div onClick={()=>{navigator.clipboard?.writeText(ctxMenu.msg.content).catch(()=>{});setCtxMenu(null);}} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,color:"#666"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>📋 复制文本</div>
      </div>
    )}

    {/* ── 群组右键菜单（新增 Q仔设置入口）── */}
    {groupCtxMenu&&(
      <div onClick={e=>e.stopPropagation()} style={{position:"fixed",left:groupCtxMenu.x,top:groupCtxMenu.y,background:"#fff",border:"1px solid #E5E8EE",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.14)",zIndex:9998,minWidth:160,overflow:"hidden"}}>
        <div onClick={()=>openGroupSetup(groupCtxMenu.chatId)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7,color:"#1677FF"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F0F7FF"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>⚙️ Q仔设置</div>
        <div style={{height:1,background:"#F0F0F0"}}/>
        <div onClick={()=>setGroupCtxMenu(null)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,color:"#666"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>取消</div>
      </div>
    )}

    {/* ── AI总结右键菜单 ── */}
    {aiCtxMenu&&(
      <div onClick={e=>e.stopPropagation()} style={{position:"fixed",left:aiCtxMenu.x,top:aiCtxMenu.y,background:"#fff",border:"1px solid #E5E8EE",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.14)",zIndex:9998,minWidth:160,overflow:"hidden"}}>
        <div onClick={()=>captureAIContent(aiCtxMenu.content)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>🔵 抓取为方案参考</div>
        <div style={{height:1,background:"#F0F0F0"}}/>
        <div onClick={()=>{navigator.clipboard?.writeText(aiCtxMenu.content).catch(()=>{});setAiCtxMenu(null);}} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,color:"#666"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>📋 复制文本</div>
      </div>
    )}

    {/* ══════════════════════════════════════════════════════
        左侧导航条
    ══════════════════════════════════════════════════════ */}
    <div style={{width:56,background:"linear-gradient(180deg,#2D3138 0%,#1F2329 100%)",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:16,gap:4}}>
      <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",marginBottom:12,border:"2px solid #fff"}}>小A</div>
      {([{icon:"💬",badge:totalUnread as number,active:true},{icon:"👥"},{icon:"📁"},{icon:"🎮"},{icon:"📅"}] as {icon:string;badge?:number;active?:boolean}[]).map((item,i)=>(
        <div key={i} style={{position:"relative",width:40,height:40,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",background:item.active?"rgba(74,144,217,0.2)":"transparent",color:item.active?"#4A90D9":"#9DA1A6"}}>
          {item.icon}
          {item.badge&&item.badge>0?<div style={{position:"absolute",top:-2,right:-2,background:"#FF4D4F",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,minWidth:16,textAlign:"center"}}>{item.badge>99?"99+":item.badge}</div>:null}
        </div>
      ))}
      <div style={{flex:1}}/>
      {/* Q仔学习状态绿点 */}
      {allLearnLog.length>0&&<div style={{width:8,height:8,borderRadius:"50%",background:"#52C41A",boxShadow:"0 0 6px #52C41A",marginBottom:4}} title="Q仔正在学习中"/>}
      <div style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",marginBottom:12}}>Q</div>
    </div>

    {/* ══════════════════════════════════════════════════════
        聊天列表（群组头像新增 Q 监听标记）
    ══════════════════════════════════════════════════════ */}
    <div style={{width:280,background:"#fff",borderRight:"1px solid #E5E5E5",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #F0F0F0",display:"flex",alignItems:"center",gap:8}}>
        <div style={{flex:1,height:30,background:"#F5F5F5",borderRadius:6,padding:"0 10px",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:13,color:"#999"}}>🔍</span>
          <input value={searchKw} onChange={e=>setSearchKw(e.target.value)} placeholder="搜索" style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:12.5,color:"#333"}}/>
        </div>
        <div style={{width:28,height:28,borderRadius:6,background:"#F5F5F5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#666",cursor:"pointer"}}>+</div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {filteredChats.map(chat=>{
          const lastMsgs=messages[chat.id]||[];
          const previewMsg=lastMsgs[lastMsgs.length-1];
          const previewText=previewMsg?(previewMsg.isSystem?previewMsg.content:`${previewMsg.self?"":previewMsg.sender+": "}${previewMsg.content.replace(/\n/g," ").slice(0,20)}`):chat.lastMsg;
          const unread=unreadMap[chat.id]||0;
          const isMonitored=chat.type==="group"&&monitoredGroups.has(chat.id);
          return (
            <div key={chat.id} onClick={()=>handleSelectChat(chat.id)}
              onContextMenu={e=>handleGroupCM(e,chat.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",background:activeChat===chat.id?"#E8F0FE":chat.pinned?"#FAFBFD":"transparent",borderBottom:"1px solid #F5F5F5"}}>
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:42,height:42,borderRadius:8,background:chat.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:chat.avatar.length>1?18:16,fontWeight:700,color:"#fff"}}>{chat.avatar}</div>
                {chat.online&&<div style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,borderRadius:"50%",background:"#52C41A",border:"2px solid #fff"}}/>}
                {/* Q仔监听标记（蓝色Q角标）*/}
                {isMonitored&&<div style={{position:"absolute",bottom:-3,right:-3,width:14,height:14,borderRadius:"50%",background:"#1677FF",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff"}}>Q</div>}
              </div>
              <div style={{flex:1,overflow:"hidden",minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#333",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>
                    {chat.pinned&&<span style={{color:"#FA8C16",marginRight:3,fontSize:10}}>📌</span>}{chat.name}
                  </span>
                  <span style={{fontSize:10.5,color:"#999",marginLeft:6,flexShrink:0}}>{chat.lastTime}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:11.5,color:"#999",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{previewText}</span>
                  {unread>0&&<div style={{background:"#FF4D4F",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10,minWidth:18,textAlign:"center",marginLeft:4}}>{unread>99?"99+":unread}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{padding:"10px 14px",borderTop:"1px solid #F0F0F0",display:"flex",alignItems:"center",gap:8,background:"#FAFBFD"}}>
        <div style={{width:26,height:26,borderRadius:6,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>Q</div>
        <div style={{flex:1}}>
          <div style={{fontSize:11.5,fontWeight:600,color:"#4A90D9"}}>Q 仔时间管理</div>
          <div style={{fontSize:10,color:"#999"}}>已监听 {monitoredGroups.size} 个群 · {capsules.length} 个代办</div>
        </div>
        {pendingCount>0&&<div style={{background:"#FA8C16",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{pendingCount}</div>}
      </div>
    </div>

    {/* ══════════════════════════════════════════════════════
        中间聊天区（含智能检索面板覆盖层）
    ══════════════════════════════════════════════════════ */}
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#F0F2F5",minWidth:0,position:"relative"}}>

      {/* 聊天顶栏 */}
      <div style={{padding:"12px 20px",background:"#fff",borderBottom:"1px solid #E5E5E5",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:6,background:currentChat?.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>{currentChat?.avatar}</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#333"}}>{currentChat?.name}{currentChat?.count&&<span style={{fontSize:12,color:"#999",marginLeft:6,fontWeight:400}}>({currentChat.count})</span>}</div>
            <div style={{fontSize:11,color:"#999",marginTop:1}}>{isPrivate?(currentChat?.online?"● 在线":"离线"):`${currentChat?.category}群`}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>openAI(activeChat)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 12px",background:aiVisible&&aiChatId===activeChat?"linear-gradient(135deg,#4A90D9,#7B68EE)":"#F0F7FF",color:aiVisible&&aiChatId===activeChat?"#fff":"#4A90D9",border:"1.5px solid #BAE0FF",borderRadius:14,fontSize:12,fontWeight:600,cursor:"pointer"}}>✨ AI总结</button>
          {isPrivate?(
            <button onClick={toggleSelectMode} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:selectMode?"#E8F0FE":"#F5F5F5",color:selectMode?"#4A90D9":"#666",border:"1.5px solid "+(selectMode?"#BAE0FF":"#E5E5E5"),borderRadius:12,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              ☑️ {selectMode?"退出多选":"多选消息"}
            </button>
          ):(
            <div style={{fontSize:11,color:monitoredGroups.has(activeChat)?"#1677FF":"#999",background:monitoredGroups.has(activeChat)?"#E6F4FF":"#F5F5F5",padding:"4px 10px",borderRadius:12,border:`1px solid ${monitoredGroups.has(activeChat)?"#91CAFF":"#E5E5E5"}`,display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:monitoredGroups.has(activeChat)?"#1677FF":"#999",display:"inline-block"}}/>
              {monitoredGroups.has(activeChat)?"Q仔监听中":"未开启监听"}
            </div>
          )}
        </div>
      </div>

      {/* 多选提示栏 */}
      {selectMode&&(
        <div style={{background:"#E8F0FE",padding:"6px 20px",borderBottom:"1px solid #BAE0FF",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <span style={{fontSize:12,color:"#4A90D9",fontWeight:600}}>☑️ 多选模式 · 已选 {selMsgIds.size} 条</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={handleMultiAI} disabled={selMsgIds.size===0} style={{padding:"4px 12px",borderRadius:8,border:"none",background:selMsgIds.size>0?"linear-gradient(135deg,#4A90D9,#7B68EE)":"#ccc",color:"#fff",fontSize:11,fontWeight:600,cursor:selMsgIds.size>0?"pointer":"default"}}>
              ✨ AI分析选中（{selMsgIds.size}条）
            </button>
            <button onClick={()=>{setSelectMode(false);setSelMsgIds(new Set());}} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #BAE0FF",background:"transparent",color:"#666",fontSize:11,cursor:"pointer"}}>✗ 取消</button>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 20px",display:"flex",flexDirection:"column",gap:4}}>
        {(messages[activeChat]||[]).map((msg,idx)=>{
          const prev=(messages[activeChat]||[])[idx-1];
          const showDate=msg.date&&(!prev||prev.date!==msg.date);
          const isSelected=selMsgIds.has(msg.id);
          const isHighlighted=highlightMsgId===msg.id;
          if(msg.isSystem)return(
            <div key={msg.id}>
              {showDate&&<div style={{textAlign:"center",margin:"16px 0 12px",fontSize:11,color:"#999"}}><span style={{background:"#E5E8EE",padding:"3px 12px",borderRadius:10}}>{msg.date}</span></div>}
              <div style={{textAlign:"center",margin:"6px 0",fontSize:11,color:"#999"}}>{msg.content}</div>
            </div>
          );
          return(
            <div key={msg.id}>
              {showDate&&<div style={{textAlign:"center",margin:"16px 0 12px",fontSize:11,color:"#999"}}><span style={{background:"#E5E8EE",padding:"3px 12px",borderRadius:10}}>{msg.date}</span></div>}
              <div style={{display:"flex",flexDirection:"row",alignItems:"flex-start",gap:8,marginBottom:10,
                background:isHighlighted?"rgba(255,215,0,0.25)":isSelected?"rgba(74,144,217,0.08)":"transparent",
                borderRadius:8,padding:(isHighlighted||isSelected)?"4px 6px":"0",
                cursor:selectMode?"pointer":"default",justifyContent:msg.self?"flex-end":"flex-start",
                transition:"background 0.3s",border:isHighlighted?"1.5px solid #FFD700":"1.5px solid transparent"}}
                onClick={selectMode?()=>toggleMsgSel(msg.id):undefined}>
                {selectMode&&isPrivate&&(
                  <div style={{display:"flex",alignItems:"center",flexShrink:0,marginTop:10}}>
                    <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${isSelected?"#4A90D9":"#ccc"}`,background:isSelected?"#4A90D9":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {isSelected&&<span style={{color:"#fff",fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
                    </div>
                  </div>
                )}
                <div style={{display:"flex",flexDirection:msg.self?"row-reverse":"row",alignItems:"flex-start",gap:8,maxWidth:"100%"}}>
                  <div style={{width:36,height:36,borderRadius:6,flexShrink:0,background:msg.isAI?"linear-gradient(135deg,#4A90D9,#9B59B6)":msg.self?"linear-gradient(135deg,#4A90D9,#7B68EE)":`hsl(${(msg.sender.charCodeAt(0)*17)%360},60%,60%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>
                    {msg.isAI?"Q":msg.self?"我":msg.sender.slice(0,1)}
                  </div>
                  <div style={{maxWidth:380,display:"flex",flexDirection:"column",alignItems:msg.self?"flex-end":"flex-start"}}>
                    {!msg.self&&<div style={{fontSize:11,color:msg.isAI?"#4A90D9":"#666",marginBottom:3,fontWeight:msg.isAI?600:400}}>{msg.isAI?"Q 仔 · AI助手":msg.sender}<span style={{color:"#bbb",marginLeft:6,fontSize:10}}>{msg.time}</span></div>}
                    <div onContextMenu={e=>handleCM(e,msg,activeChat)}
                      style={{padding:"8px 12px",borderRadius:msg.self?"10px 4px 10px 10px":"4px 10px 10px 10px",
                        background:msg.self?"#A6D8FF":msg.isAI?"linear-gradient(135deg,#F0F7FF,#F5F0FF)":"#fff",
                        color:"#333",fontSize:13.5,lineHeight:1.55,
                        border:msg.atMe?"1.5px solid #FA8C16":msg.isAI?"1px solid #BAE0FF":"1px solid #EAEAEA",
                        whiteSpace:"pre-line",wordBreak:"break-word",boxShadow:"0 1px 2px rgba(0,0,0,0.04)",cursor:"context-menu",userSelect:"text"}}>
                      {msg.content}
                    </div>
                    {msg.self&&<div style={{fontSize:10,color:"#bbb",marginTop:3}}>{msg.time}</div>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef}/>
      </div>

      {/* 聊天输入区（含🔍智能检索入口）*/}
      <div style={{background:"#fff",borderTop:"1px solid #E5E5E5",flexShrink:0}}>
        <div style={{padding:"8px 16px 4px",display:"flex",alignItems:"center",gap:14,fontSize:16}}>
          {["😀","✂️","📁","🖼️","📨","🎤"].map((i,k)=><span key={k} style={{cursor:"pointer",color:"#666"}}>{i}</span>)}
        </div>
        <div style={{padding:"0 16px 12px"}}>
          <div style={{minHeight:56,padding:"8px 12px",background:"#F8F9FB",borderRadius:6,border:"1px solid #EAEAEA",fontSize:12.5,color:"#bbb"}}>输入消息…</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
            {/* 🔍 智能检索按钮 */}
            <button onClick={()=>setShowSearchPanel(true)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:10,border:"1.5px solid #BAE0FF",background:"#F0F7FF",color:"#4A90D9",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              🔍 智能检索
            </button>
            <button style={{padding:"5px 18px",borderRadius:4,border:"none",background:"linear-gradient(135deg,#4A90D9,#2563EB)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>发送 ▾</button>
          </div>
        </div>
      </div>

      {/* ── 智能检索面板（覆盖层）── */}
      {showSearchPanel&&(
        <div style={{position:"absolute",inset:0,background:"#fff",zIndex:200,display:"flex",flexDirection:"column"}}>
          {/* 搜索面板头部 */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid #F0F0F0",display:"flex",alignItems:"center",gap:10,background:"#fff",flexShrink:0}}>
            <button onClick={()=>setShowSearchPanel(false)} style={{background:"none",border:"none",fontSize:18,color:"#666",cursor:"pointer",padding:"0 4px"}}>←</button>
            <div style={{flex:1,height:34,background:"#F5F5F5",borderRadius:8,display:"flex",alignItems:"center",gap:8,padding:"0 12px"}}>
              <span style={{color:"#999",fontSize:14}}>🔍</span>
              <input ref={searchInputRef} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleSmartSearch();}} placeholder="搜索聊天内容…" style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:13,color:"#333"}}/>
              {searchQuery&&<button onClick={()=>setSearchQuery("")} style={{background:"none",border:"none",fontSize:14,color:"#bbb",cursor:"pointer"}}>×</button>}
            </div>
            <button onClick={handleSmartSearch} style={{padding:"6px 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>搜索</button>
          </div>

          {/* 搜索类型 Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid #F0F0F0",background:"#FAFBFD",flexShrink:0}}>
            {(["全部","图片/视频","文件","链接","🔍 智能检索"] as const).map((tab,i)=>(
              <button key={tab} onClick={()=>setSearchMode(i===4?"smart":"normal")}
                style={{flex:1,padding:"9px 4px",border:"none",background:(i===4&&searchMode==="smart")||(i!==4&&searchMode==="normal"&&i===0)?"#fff":"transparent",
                  color:(i===4&&searchMode==="smart")?"#4A90D9":"#666",
                  fontSize:11,fontWeight:(i===4&&searchMode==="smart")?700:400,cursor:"pointer",
                  borderBottom:(i===4&&searchMode==="smart")?"2px solid #4A90D9":"2px solid transparent",
                  whiteSpace:"nowrap"}}>
                {tab}
              </button>
            ))}
          </div>

          {/* 智能检索内容区 */}
          <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
            {searchMode==="smart"&&(
              <>
                {/* 未搜索时的提示 */}
                {!keywordLoading&&!searchDone&&(
                  <div style={{textAlign:"center",padding:"40px 20px",color:"#bbb"}}>
                    <div style={{fontSize:32,marginBottom:12}}>🧠</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#666",marginBottom:8}}>Q仔智能检索</div>
                    <div style={{fontSize:12,color:"#bbb",lineHeight:1.7}}>
                      不记得用什么词发的？<br/>
                      直接说你想找的事情，Q仔帮你找。<br/><br/>
                      <span style={{color:"#4A90D9",background:"#F0F7FF",padding:"3px 8px",borderRadius:6,fontSize:11}}>试试：「教务系统密码是什么」</span>
                    </div>
                  </div>
                )}

                {/* AI关键词生成动画 */}
                {(keywordLoading||aiKeywords.length>0)&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11.5,color:"#4A90D9",fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:16,height:16,borderRadius:"50%",background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>Q</div>
                      {keywordLoading?"🤖 Q仔正在理解你的需求…":"✅ Q仔已生成相关检索词"}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {aiKeywords.map((kw,i)=>(
                        <span key={i} style={{padding:"3px 10px",borderRadius:12,background:"#E8F0FE",color:"#4A90D9",fontSize:11.5,fontWeight:600,border:"1px solid #BAE0FF",
                          animation:"fadeIn 0.3s ease"}}>
                          {kw}
                        </span>
                      ))}
                      {keywordLoading&&<span style={{padding:"3px 10px",color:"#bbb",fontSize:11}}>生成中…</span>}
                    </div>
                  </div>
                )}

                {/* 搜索结果 */}
                {searchDone&&(
                  <div>
                    <div style={{fontSize:11.5,color:"#999",marginBottom:10,fontWeight:600}}>
                      {searchResults.length>0?`找到 ${searchResults.length} 条相关消息（当前对话内）`:"未在当前对话中找到相关内容，尝试调整关键词"}
                    </div>
                    {searchResults.map((result,i)=>(
                      <div key={i} onClick={()=>handleSearchResultClick(result)}
                        style={{padding:"12px 14px",borderRadius:10,border:"1px solid #E5E8EE",background:"#fff",marginBottom:8,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#fff"}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                          <div style={{width:20,height:20,borderRadius:4,background:`hsl(${(result.sender.charCodeAt(0)*17)%360},60%,60%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>
                            {result.sender.slice(0,1)}
                          </div>
                          <span style={{fontSize:11.5,fontWeight:600,color:"#333"}}>{result.sender}</span>
                          <span style={{fontSize:10.5,color:"#bbb",marginLeft:"auto"}}>{result.date||""} {result.time}</span>
                        </div>
                        <div style={{fontSize:12.5,color:result.isSensitive?"#8C8C8C":"#333",lineHeight:1.5,display:"flex",alignItems:"center",gap:6}}>
                          {result.isSensitive&&<span style={{fontSize:13}}>🔒</span>}
                          {result.content}
                        </div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6}}>
                          <span style={{fontSize:10,color:"#4A90D9",background:"#E8F0FE",padding:"1px 6px",borderRadius:6}}>匹配：{result.matchedKeyword}</span>
                          <span style={{fontSize:10,color:"#bbb"}}>点击定位消息 →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {searchMode==="normal"&&(
              <div style={{textAlign:"center",padding:"40px",color:"#bbb",fontSize:13}}>
                请切换到「🔍 智能检索」体验 AI 语义搜索
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* ══════════════════════════════════════════════════════
        右侧面板（新增「跨群分析」Tab，共5个Tab）
    ══════════════════════════════════════════════════════ */}
    <div style={{width:360,background:"#fff",borderLeft:"1px solid #E5E5E5",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* AI总结面板（aiVisible时显示）*/}
      {aiVisible&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #F0F0F0",display:"flex",alignItems:"center",justifyContent:"space-between",background:sharedMode?"linear-gradient(135deg,#F3E5F5 0%,#E8F0FE 100%)":"linear-gradient(135deg,#F0F7FF 0%,#F5F0FF 100%)",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{position:"relative"}}>
                <div style={{width:28,height:28,borderRadius:6,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>Q</div>
                {sharedMode&&<div style={{position:"absolute",bottom:-4,right:-14,width:22,height:22,borderRadius:5,background:sharedMode.partnerColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",border:"2px solid #fff"}}>{sharedMode.partnerName.slice(0,1)}</div>}
              </div>
              <div style={{marginLeft:sharedMode?12:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#333",display:"flex",alignItems:"center",gap:6}}>
                  Q仔 · AI 对话总结
                  {sharedMode&&<span style={{fontSize:10,background:"#7B68EE",color:"#fff",padding:"1px 6px",borderRadius:8,fontWeight:600}}>🤝 协作中</span>}
                </div>
                <div style={{fontSize:10,color:"#999"}}>基于「{CHATS.find(c=>c.id===aiChatId)?.name}」</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {CHATS.find(c=>c.id===aiChatId)?.type==="private"&&!sharedMode&&aiMessages.length>0&&(
                <button onClick={handleShareAI} style={{fontSize:11,padding:"3px 8px",borderRadius:8,border:"1.5px solid #7B68EE",background:"#F3E5F5",color:"#7B68EE",fontWeight:600,cursor:"pointer"}}>📤 共享</button>
              )}
              <button onClick={()=>{setAiVisible(false);setSharedMode(null);}} style={{fontSize:18,color:"#999",cursor:"pointer",background:"none",border:"none",padding:"0 4px"}}>×</button>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
            {aiMessages.map((msg,i)=>{
              const isPartner=msg.role==="partner";
              const isUser=msg.role==="user";
              const partnerColor=sharedMode?.partnerColor||"#36CFC9";
              return(
                <div key={i} style={{display:"flex",flexDirection:isUser?"row-reverse":"row",alignItems:"flex-start",gap:6}}>
                  <div style={{width:26,height:26,borderRadius:5,flexShrink:0,background:isUser?"#4A90D9":isPartner?partnerColor:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>
                    {isUser?"我":isPartner?(msg.sender?.slice(0,1)||"他"):"Q"}
                  </div>
                  <div style={{maxWidth:"82%"}}>
                    {isPartner&&<div style={{fontSize:10,color:partnerColor,fontWeight:600,marginBottom:2}}>{msg.sender}</div>}
                    <div onContextMenu={!isUser?e=>{e.preventDefault();e.stopPropagation();setAiCtxMenu({x:e.clientX,y:e.clientY,content:msg.content});}:undefined}
                      style={{padding:"9px 12px",borderRadius:isUser?"10px 4px 10px 10px":"4px 10px 10px 10px",background:isUser?"#A6D8FF":isPartner?`${partnerColor}22`:"#F5F7FA",fontSize:12.5,color:"#333",lineHeight:1.6,whiteSpace:"pre-line",border:`1px solid ${isUser?"transparent":isPartner?`${partnerColor}55`:"#E5E8EE"}`,cursor:!isUser?"context-menu":"default"}}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            {aiLoading&&(
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:26,height:26,borderRadius:5,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>Q</div>
                <div style={{padding:"8px 12px",borderRadius:"4px 10px 10px 10px",background:"#F5F7FA",fontSize:12,color:"#999"}}>Q仔思考中…</div>
              </div>
            )}
            <div ref={aiEndRef}/>
          </div>
          <div style={{padding:"8px 14px",borderTop:"1px solid #F0F0F0",flexShrink:0}}>
            <div style={{fontSize:10.5,color:"#999",marginBottom:7}}>快速提问</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {(
                aiChatId===20?["互动时长怎么折中🎮","嘉宾邀请的建议💡","谁的想法更合理⚖️"]:
                aiChatId===21?["谁的做法正确⚖️","如何化解冲突🤝"]:
                aiChatId===4?["作业要求📝","DDL汇总⏰"]:
                ["有哪些DDL⏰","总结待办📝"]
              ).map((q,i)=>(
                <button key={i} onClick={()=>sendAI(q)} style={{padding:"5px 10px",borderRadius:12,border:"1px solid #E5E8EE",background:"#FAFBFD",color:"#4A90D9",fontSize:11,fontWeight:500,cursor:"pointer"}}>{q}</button>
              ))}
            </div>
          </div>
          <div style={{padding:"10px 12px",borderTop:"1px solid #F0F0F0",display:"flex",gap:6,flexShrink:0}}>
            <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&aiInput.trim())sendAI();}} placeholder={sharedMode?`和 ${sharedMode.partnerName} 一起问 Q仔…`:"问问Q仔"} style={{flex:1,height:32,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:12,outline:"none",color:"#333"}}/>
            <button onClick={()=>sendAI()} style={{padding:"0 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>发送</button>
          </div>
        </div>
      )}

      {/* 5个 Tab 面板（aiVisible=false时显示）*/}
      {!aiVisible&&(
        <>
          {/* ── Tab 导航（5个）── */}
          <div style={{display:"flex",borderBottom:"1px solid #E5E5E5",background:"#FAFBFD",flexShrink:0,overflowX:"auto"}}>
            {([
              {key:"schedule", label:"📅 日程",  count:0},
              {key:"capsule",  label:"📋 代办",  count:pendingCount},
              {key:"priority", label:"🎯 优先级",count:0},
              {key:"cross",    label:"🔗 跨群",  count:0},
              {key:"profile",  label:"👤 了解你",count:allLearnLog.filter(l=>l.time!=="历史").length},
            ] as {key:string;label:string;count:number}[]).map(tab=>(
              <button key={tab.key} onClick={()=>setRightTab(tab.key as RightTab)}
                style={{flex:1,padding:"10px 2px",border:"none",background:rightTab===tab.key?"#fff":"transparent",color:rightTab===tab.key?"#4A90D9":"#666",fontSize:10.5,fontWeight:rightTab===tab.key?700:500,cursor:"pointer",borderBottom:rightTab===tab.key?"2px solid #4A90D9":"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:3,whiteSpace:"nowrap"}}>
                {tab.label}
                {tab.count>0&&<span style={{background:rightTab===tab.key?"#4A90D9":tab.key==="profile"?"#52C41A":"#FA8C16",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 4px",borderRadius:7}}>{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* ── 📅 日程 Tab ── */}
          {rightTab==="schedule"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
              <div style={{padding:"10px 12px",background:"linear-gradient(135deg,#F5F0FF 0%,#FFF0F5 100%)",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                <div style={{fontSize:11,color:"#9B59B6",fontWeight:600,marginBottom:6}}>2024-2025学年 第2学期</div>
                <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>
                  <button onClick={()=>setWeekStart(addDays(weekStart,-7))} style={{border:"none",background:"transparent",cursor:"pointer",color:"#666",fontSize:16,padding:"0 4px"}}>◀</button>
                  <div style={{flex:1,display:"flex",gap:3}}>
                    {weekDays.map(d=>{
                      const hasEv=eventDates.has(d);const isToday=d===TODAY;const isSel=d===schDate;
                      return(
                        <div key={d} onClick={()=>setSchDate(d)} style={{flex:1,textAlign:"center",padding:"4px 2px",borderRadius:6,background:isSel?"#4A90D9":isToday?"#E8F0FE":"transparent",cursor:"pointer",border:isToday&&!isSel?"1px solid #4A90D9":"1px solid transparent"}}>
                          <div style={{fontSize:10,color:isSel?"#fff":isToday?"#4A90D9":"#999"}}>{getDayName(d)}</div>
                          <div style={{fontSize:12,fontWeight:isSel?700:400,color:isSel?"#fff":isToday?"#4A90D9":"#333"}}>{d.slice(8)}</div>
                          {hasEv&&<div style={{width:4,height:4,borderRadius:"50%",background:isSel?"#fff":"#4A90D9",margin:"2px auto 0"}}/>}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={()=>setWeekStart(addDays(weekStart,7))} style={{border:"none",background:"transparent",cursor:"pointer",color:"#666",fontSize:16,padding:"0 4px"}}>▶</button>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#333"}}>{formatDate(schDate)} {getDayName(schDate)}</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={openAddEv} style={{padding:"3px 10px",borderRadius:8,border:"1.5px solid #4A90D9",background:"transparent",color:"#4A90D9",fontSize:11,fontWeight:600,cursor:"pointer"}}>+ 添加</button>
                    <button onClick={()=>{setShowImportModal(true);setImportStep("choose");}} style={{padding:"3px 10px",borderRadius:8,border:"1.5px solid #52C41A",background:"#F6FFED",color:"#52C41A",fontSize:11,fontWeight:600,cursor:"pointer"}}>📥 导入</button>
                  </div>
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:7,minHeight:0}}>
                {dayEvs.length===0?(
                  <div style={{padding:30,textAlign:"center",color:"#bbb",fontSize:13}}>暂无日程 🐟<br/><span style={{fontSize:11}}>点击「+ 添加」或「📥 导入」</span></div>
                ):dayEvs.map(ev=>{
                  const pc=prColor(ev.priority);const isHL=highlightId===ev.id;
                  return(
                    <div key={ev.id} onClick={()=>{setReminderEv(ev);setSentReminder(false);setReminderTimeOpt("3h");setReminderCustomT("21:00");setSelStyle(aiRecommendedStyleIdx);}}
                      style={{display:"flex",gap:8,padding:"9px 11px",background:ev.color,borderRadius:9,border:isHL?`2px solid ${pc}`:"1px solid rgba(0,0,0,0.06)",cursor:"pointer",transition:"all 0.3s",transform:isHL?"scale(1.02)":"scale(1)",boxShadow:isHL?`0 0 0 3px ${pc}33,0 4px 14px rgba(0,0,0,0.1)`:undefined}}>
                      <div style={{width:4,borderRadius:2,background:pc,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#333",display:"flex",alignItems:"center",gap:6}}>
                          {ev.title}
                          {isHL&&<span style={{fontSize:10,background:pc,color:"#fff",padding:"1px 5px",borderRadius:6,fontWeight:600,flexShrink:0}}>✨新</span>}
                        </div>
                        <div style={{fontSize:10.5,color:"#666",marginTop:2}}>🕒 {ev.startTime}–{ev.endTime}{ev.location&&<span style={{marginLeft:8}}>📍 {ev.location}</span>}</div>
                        {ev.fromCapsule&&<div style={{fontSize:10,color:"#4A90D9",marginTop:2,fontWeight:600}}>📋 来自代办 · {ev.groupName}</div>}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();openEditEv(ev);}} style={{padding:"2px 7px",borderRadius:5,border:"1px solid #d0d0d0",background:"#fff",color:"#666",fontSize:10,cursor:"pointer"}}>✏️</button>
                        <button onClick={e=>{e.stopPropagation();deleteEv(ev.id);}} style={{padding:"2px 7px",borderRadius:5,border:"1px solid #ffa39e",background:"#fff",color:"#FF4D4F",fontSize:10,cursor:"pointer"}}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 📋 代办 Tab（冲突代办点击触发Q仔建议弹窗）── */}
          {rightTab==="capsule"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
              <div style={{padding:"8px 12px",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                  {(["all","week","event","conflict","confirmed","info"] as CapsuleFilter[]).map(f=>{
                    const labels:Record<string,string>={all:"全部",week:"近一周",event:"📌 事件",conflict:"⚠️ 冲突",confirmed:"✅ 已确认",info:"🔵 信息"};
                    return <button key={f} onClick={()=>setCapFilter(f)} style={{padding:"3px 8px",borderRadius:8,border:"1px solid "+(capFilter===f?"#4A90D9":"#E5E8EE"),background:capFilter===f?"#E8F0FE":"transparent",color:capFilter===f?"#4A90D9":"#666",fontSize:11,fontWeight:capFilter===f?700:400,cursor:"pointer"}}>{labels[f]}</button>;
                  })}
                </div>
                <div style={{fontSize:11,color:"#999",marginTop:2}}>显示 {filteredCaps.length}/{capsules.length} 个代办</div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
                {filteredCaps.length===0&&<div style={{textAlign:"center",padding:30,color:"#bbb",fontSize:13}}>暂无符合条件的代办</div>}
                {filteredCaps.map(cap=>{
                  const st=getCS(cap);
                  const isNew=newCapIds.includes(cap.id);
                  const isFlying=flyingCap===cap.id;
                  const teacherProfile=TEACHER_PROFILES[cap.from];
                  return(
                    <div key={cap.id} style={{background:st.bg,border:`1.5px solid ${st.border}`,borderRadius:12,padding:"10px 12px",transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",transform:isFlying?"scale(1.04)":"scale(1)",boxShadow:isNew?`0 0 0 2px ${st.border}66,0 4px 14px ${st.border}44`:"0 1px 4px rgba(0,0,0,0.05)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:st.dot,flexShrink:0}}/>
                        <span style={{fontSize:12.5,fontWeight:700,color:"#1a1a2e",flex:1}}>{cap.title}</span>
                        <span style={{fontSize:10,fontWeight:600,color:st.badge,background:st.badge+"22",padding:"1px 7px",borderRadius:8}}>{st.label}</span>
                      </div>
                      <div style={{fontSize:11.5,color:"#3a3a5c",lineHeight:1.55,marginBottom:6,whiteSpace:"pre-line"}}>
                        {cap.type==="sensitive"&&!unlockedCaps.has(cap.id)
                          ?<span style={{color:"#8C8C8C",fontFamily:"monospace"}}>账号：****　密码：****</span>
                          :unlockedCaps.has(cap.id)&&cap.rawContent?cap.rawContent:cap.content}
                      </div>
                      {/* 老师画像标签（可点击展开推断来源）*/}
                      {teacherProfile&&(
                        <div>
                          <div onClick={()=>setShowTeacherEvidence(showTeacherEvidence===cap.from?null:cap.from)}
                            style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:8,background:`${teacherProfile.color}12`,border:`1px solid ${teacherProfile.color}33`,marginBottom:7,cursor:"pointer"}}>
                            <span style={{fontSize:10}}>{teacherProfile.icon}</span>
                            <span style={{fontSize:10,color:teacherProfile.color,fontWeight:600}}>{cap.from}：{teacherProfile.label}</span>
                            <span style={{fontSize:9,color:teacherProfile.color,opacity:0.7}}>{showTeacherEvidence===cap.from?"▲":"▼"}</span>
                          </div>
                          {showTeacherEvidence===cap.from&&(
                            <div style={{background:`${teacherProfile.color}08`,border:`1px solid ${teacherProfile.color}22`,borderRadius:8,padding:"6px 10px",marginBottom:7,fontSize:10.5,color:"#555",lineHeight:1.6}}>
                              <div style={{fontWeight:600,color:teacherProfile.color,marginBottom:4}}>🤖 Q仔的推断依据（来自聊天记录）</div>
                              {teacherProfile.evidence.map((e,i)=>(
                                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:3}}>
                                  <span style={{color:teacherProfile.color,flexShrink:0}}>•</span>
                                  <span>{e}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {(cap.type==="pending"||cap.type==="conflict")&&(
                        <div style={{fontSize:10,color:"#8B9ABF",marginBottom:7,fontStyle:"italic",lineHeight:1.4,background:"#F8F9FF",padding:"4px 8px",borderRadius:6,border:"1px solid #E8EEFA"}}>
                          🤖 Q仔判断依据：{getAiReason(cap.title,"重要",cap.from)}
                        </div>
                      )}
                      <div style={{fontSize:10,color:"#999",marginBottom:8}}>📍 {cap.group} · {cap.from} · {cap.time}</div>
                      {cap.type==="sensitive"&&!unlockedCaps.has(cap.id)&&(
                        <button onClick={()=>{setSensitiveCapId(cap.id);setSensitiveInput("");}} style={{width:"100%",padding:"5px 0",borderRadius:6,border:"none",background:"#8C8C8C",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:6}}>
                          🔓 查看详情（需验证密码）
                        </button>
                      )}
                      {cap.type!=="confirmed"&&cap.type!=="sensitive"&&(
                        <div style={{display:"flex",gap:6}}>
                          {cap.type==="conflict"?(
                            <button onClick={()=>openConflictSuggest(cap)} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",background:"linear-gradient(135deg,#FF4D4F,#FF7875)",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                              🤖 查看Q仔建议
                            </button>
                          ):(
                            <button onClick={()=>confirmCap(cap.id)} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",background:st.badge,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                              ✓ {cap.scheduleData?"确认入日程":"确认"}
                            </button>
                          )}
                          <button onClick={()=>dismissCap(cap.id)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${st.border}`,background:"transparent",color:"#999",fontSize:11,cursor:"pointer"}}>✗</button>
                        </div>
                      )}
                      {cap.type==="sensitive"&&unlockedCaps.has(cap.id)&&(
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>confirmCap(cap.id)} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",background:st.badge,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>✓ 确认</button>
                          <button onClick={()=>dismissCap(cap.id)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${st.border}`,background:"transparent",color:"#999",fontSize:11,cursor:"pointer"}}>✗</button>
                        </div>
                      )}
                      {cap.type==="confirmed"&&<div style={{fontSize:11,color:"#52C41A",fontWeight:600}}>✓ 已加入日程</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 🎯 优先级 Tab（新增优先级偏好树）── */}
          {rightTab==="priority"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
              <div style={{padding:"10px 12px",background:"linear-gradient(135deg,#FFF7E6,#FFF0F5)",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#333",marginBottom:6}}>🎯 智能优先级排序</div>
                {/* 优先级偏好树 */}
                <div style={{background:"#fff",border:"1px solid #F0E0FF",borderRadius:10,padding:"8px 10px",marginBottom:6}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#9B59B6",marginBottom:6}}>📊 Q仔学习的你的优先级偏好</div>
                  {PRIORITY_TREE.map((node,i)=>(
                    <div key={node.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:node.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>Lv{node.level}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11.5,fontWeight:600,color:"#333"}}>{node.label}</div>
                        <div style={{fontSize:9.5,color:"#999"}}>{node.learnedFrom}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{fontSize:9.5,color:"#bbb",marginTop:4,fontStyle:"italic"}}>🤖 基于你过去 12 次冲突时的选择记录</div>
                </div>
                {aiLearnLog.length>0&&(
                  <div style={{fontSize:10.5,color:"#7B68EE",background:"#F3E5F5",padding:"4px 8px",borderRadius:8,display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:"#52C41A",display:"inline-block"}}/>
                    Q仔已更新 {aiLearnLog.length} 次偏好记录
                  </div>
                )}
              </div>
              {/* 老师画像 */}
              <div style={{padding:"8px 12px",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:6}}>👩‍🏫 老师画像（点击查看推断来源）</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {Object.entries(TEACHER_PROFILES).slice(0,4).map(([name,profile])=>(
                    <div key={name} onClick={()=>setShowTeacherEvidence(showTeacherEvidence===name?null:name)}
                      style={{padding:"3px 8px",borderRadius:8,background:`${profile.color}12`,border:`1px solid ${profile.color}33`,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:10}}>{profile.icon}</span>
                      <span style={{fontSize:10,color:profile.color,fontWeight:600}}>{name}·{profile.label}</span>
                    </div>
                  ))}
                </div>
                {showTeacherEvidence&&TEACHER_PROFILES[showTeacherEvidence]&&(
                  <div style={{marginTop:8,background:`${TEACHER_PROFILES[showTeacherEvidence].color}08`,border:`1px solid ${TEACHER_PROFILES[showTeacherEvidence].color}22`,borderRadius:8,padding:"8px 10px",fontSize:10.5,lineHeight:1.6}}>
                    <div style={{fontWeight:600,color:TEACHER_PROFILES[showTeacherEvidence].color,marginBottom:4}}>
                      🤖 Q仔如何推断「{showTeacherEvidence}·{TEACHER_PROFILES[showTeacherEvidence].label}」
                    </div>
                    {TEACHER_PROFILES[showTeacherEvidence].evidence.map((e,i)=>(
                      <div key={i} style={{display:"flex",gap:5,marginBottom:3,color:"#555"}}>
                        <span style={{color:TEACHER_PROFILES[showTeacherEvidence].color,flexShrink:0}}>•</span>
                        <span>{e}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* 优先级事项列表（原有逻辑保留）*/}
              <div style={{flex:1,overflowY:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:6,minHeight:0}}>
                {(()=>{
                  type PItem={id:string;emoji:string;level:string;color:string;title:string;desc:string};
                  const items:PItem[]=[];
                  const t3="2026-05-02";const t7="2026-05-07";
                  const skipTitles=["国家安全","近现代史","数据结构实验课","操作系统","数据库原理","软件工程","编译原理","人工智能导论"];
                  capsules.forEach(c=>{
                    if(c.type==="conflict")      items.push({id:`c${c.id}`,emoji:"🔴",level:"紧急",  color:"#FF4D4F",title:c.title,desc:c.content.slice(0,55)});
                    else if(c.type==="sensitive") items.push({id:`c${c.id}`,emoji:"⚫",level:"敏感",  color:"#8C8C8C",title:c.title,desc:"隐私信息已加密保护"});
                    else if(c.type==="plan")     items.push({id:`c${c.id}`,emoji:"🔵",level:"方案参考",color:"#3B82F6",title:c.title,desc:c.content.slice(0,55)});
                    else if(c.type==="confirmed")items.push({id:`c${c.id}`,emoji:"🟢",level:"已确认",color:"#52C41A",title:c.title,desc:"已写入日程"});
                    else if(c.importance==="high")items.push({id:`c${c.id}`,emoji:"🔴",level:"紧急",  color:"#FF4D4F",title:c.title,desc:c.content.slice(0,55)});
                    else                         items.push({id:`c${c.id}`,emoji:"🟡",level:"一般",  color:"#FAAD14",title:c.title,desc:c.content.slice(0,55)});
                  });
                  schedule.filter(ev=>!skipTitles.some(s=>ev.title.includes(s))).forEach(ev=>{
                    const desc=`${ev.date.slice(5).replace("-","/")} ${ev.startTime}${ev.location?` · ${ev.location}`:""}`;
                    if(ev.priority==="high")items.push({id:`s${ev.id}`,emoji:"🔴",level:"紧急",color:"#FF4D4F",title:ev.title,desc});
                    else if(ev.date<=t7)    items.push({id:`s${ev.id}`,emoji:"🟠",level:"重要",color:"#FA8C16",title:ev.title,desc});
                    else                    items.push({id:`s${ev.id}`,emoji:"🟢",level:"已确认",color:"#52C41A",title:ev.title,desc});
                  });
                  const ord:Record<string,number>={紧急:0,敏感:1,重要:2,一般:3,方案参考:4,已确认:5};
                  const seen=new Set<string>();
                  return items.sort((a,b)=>(ord[a.level]??9)-(ord[b.level]??9)).filter(p=>{if(seen.has(p.title))return false;seen.add(p.title);return true;}).map(item=>{
                    const done=priorityDone.has(item.id);
                    return(
                      <div key={item.id} style={{background:`${item.color}10`,border:`1.5px solid ${item.color}44`,borderRadius:10,padding:"9px 12px",display:"flex",alignItems:"flex-start",gap:8,opacity:done?0.4:1,transition:"opacity 0.3s"}}>
                        <span style={{fontSize:15,lineHeight:1.3,flexShrink:0}}>{item.emoji}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                            <span style={{fontSize:12.5,fontWeight:700,color:"#1a1a2e",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:done?"line-through":"none"}}>{item.title}</span>
                            <span style={{fontSize:10,fontWeight:600,color:item.color,background:`${item.color}22`,padding:"1px 7px",borderRadius:8,flexShrink:0}}>{item.level}</span>
                          </div>
                          <div style={{fontSize:11,color:"#666",lineHeight:1.4,marginBottom:4}}>{item.desc}</div>
                          <div style={{fontSize:10,color:"#8B9ABF",lineHeight:1.4,fontStyle:"italic",background:"#F8F9FF",padding:"3px 8px",borderRadius:5,border:"1px solid #E8EEFA"}}>
                            🤖 {getAiReason(item.title,item.level)}
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0}}>
                          <button onClick={()=>setEditingPItem({id:item.id,title:item.title,level:priorityOverrides[item.id]||item.level,desc:item.desc})} style={{width:22,height:22,borderRadius:5,border:"1px solid #d0d0d0",background:"#fff",color:"#666",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                          <button onClick={()=>{const was=priorityDone.has(item.id);setPriorityDone(p=>{const n=new Set(p);was?n.delete(item.id):n.add(item.id);return n;});}} style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${done?"#52C41A":"#d9d9d9"}`,background:done?"#52C41A":"transparent",color:"#fff",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{done?"✓":""}</button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* ── 🔗 跨群分析 Tab（全新）── */}
          {rightTab==="cross"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
              <div style={{padding:"10px 12px",background:"linear-gradient(135deg,#F3E5F5 0%,#E8F0FE 100%)",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#333",marginBottom:2}}>🔗 跨群智能分析</div>
                <div style={{fontSize:10.5,color:"#888",lineHeight:1.5}}>
                  Q仔已整合 <span style={{color:"#7B68EE",fontWeight:600}}>5个群聊 + 课表 + 代办</span>，直接提问：
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                  {["我今天应该做什么？","本周最危险的DDL？","我这周能用多少时间？"].map((q,i)=>(
                    <button key={i} onClick={()=>sendCrossAnalysis(q)} style={{padding:"3px 9px",borderRadius:10,border:"1px solid #D3B8E0",background:"#fff",color:"#7B68EE",fontSize:10.5,fontWeight:500,cursor:"pointer"}}>{q}</button>
                  ))}
                </div>
              </div>
              {/* 对话区 */}
              <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
                {crossMessages.map((msg,i)=>{
                  const isUser=msg.role==="user";
                  return(
                    <div key={i} style={{display:"flex",flexDirection:isUser?"row-reverse":"row",alignItems:"flex-start",gap:6}}>
                      <div style={{width:26,height:26,borderRadius:5,flexShrink:0,background:isUser?"#4A90D9":"linear-gradient(135deg,#9B59B6,#4A90D9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>
                        {isUser?"我":"Q"}
                      </div>
                      <div style={{maxWidth:"85%"}}>
                        <div style={{padding:"9px 12px",borderRadius:isUser?"10px 4px 10px 10px":"4px 10px 10px 10px",background:isUser?"#A6D8FF":"#F5F7FA",fontSize:12,color:"#333",lineHeight:1.65,whiteSpace:"pre-line",border:`1px solid ${isUser?"transparent":"#E5E8EE"}`}}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {crossLoading&&(
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:26,height:26,borderRadius:5,background:"linear-gradient(135deg,#9B59B6,#4A90D9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>Q</div>
                    <div style={{padding:"8px 12px",borderRadius:"4px 10px 10px 10px",background:"#F5F7FA",fontSize:12,color:"#999"}}>Q仔正在跨群分析…</div>
                  </div>
                )}
                <div ref={crossEndRef}/>
              </div>
              {/* 输入区 */}
              <div style={{padding:"10px 12px",borderTop:"1px solid #F0F0F0",display:"flex",gap:6,flexShrink:0}}>
                <input value={crossInput} onChange={e=>setCrossInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&crossInput.trim())sendCrossAnalysis();}} placeholder="问问 Q仔，比如：我今天该做什么？" style={{flex:1,height:32,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:12,outline:"none",color:"#333"}}/>
                <button onClick={()=>sendCrossAnalysis()} style={{padding:"0 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#9B59B6,#4A90D9)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>发送</button>
              </div>
            </div>
          )}

          {/* ── 👤 了解你 Tab（含学习日志）── */}
          {rightTab==="profile"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
              <div style={{padding:"10px 12px",background:"linear-gradient(135deg,#F3E5F5 0%,#E8F0FE 100%)",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:800,color:"#7B68EE",marginBottom:2}}>🧠 Q仔对你的了解</div>
                <div style={{fontSize:11,color:"#888"}}>基于近7天的真实交互行为，持续更新中</div>
                {allLearnLog.filter(l=>l.time!=="历史").length>0&&(
                  <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:"#52C41A",display:"inline-block",boxShadow:"0 0 6px #52C41A"}}/>
                    <span style={{fontSize:10.5,color:"#52C41A",fontWeight:600}}>本次会话新增 {allLearnLog.filter(l=>l.time!=="历史").length} 条学习记录</span>
                  </div>
                )}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
                {/* 任务优先偏好 */}
                <div style={{background:"#FFF9F0",border:"1px solid #FFD591",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#FA8C16",marginBottom:8}}>🎯 你的任务优先偏好</div>
                  {PROFILE_DATA.taskPref.map((t,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                      <div style={{fontSize:11,color:"#333",width:64,flexShrink:0,fontWeight:i===0?700:400}}>{t.label}</div>
                      <div style={{flex:1,height:14,background:"#FFE7BA",borderRadius:7,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(t.stars/5)*100}%`,background:"linear-gradient(90deg,#FA8C16,#FFB340)",borderRadius:7}}/>
                      </div>
                      <div style={{fontSize:9,color:"#FA8C16",fontWeight:700,flexShrink:0}}>{"★".repeat(t.stars)+"☆".repeat(5-t.stars)}</div>
                    </div>
                  ))}
                  <div style={{fontSize:10,color:"#999",marginTop:4,fontStyle:"italic"}}>🤖 通过你过去的确认/忽略行为推断</div>
                </div>

                {/* 处理习惯 */}
                <div style={{background:"#F0F9FF",border:"1px solid #BAE0FF",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#4A90D9",marginBottom:8}}>⏰ 你的处理习惯</div>
                  {PROFILE_DATA.habits.map((h,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                      <span style={{width:5,height:5,borderRadius:"50%",background:"#4A90D9",display:"inline-block",flexShrink:0}}/>
                      <span style={{fontSize:11.5,color:"#333"}}>{h}</span>
                    </div>
                  ))}
                  <div style={{fontSize:10,color:"#999",marginTop:4,fontStyle:"italic"}}>🤖 通过你的确认时间规律推断</div>
                </div>

                {/* 提醒风格偏好 */}
                <div style={{background:"#F6FFED",border:"1px solid #95DE64",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#52C41A",marginBottom:8}}>💬 你的提醒偏好</div>
                  <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                    {["温柔学姐风","毒舌室友风","佛系朋友风","正经班委风"].map((s,i)=>{
                      const cnt=reminderStyleCounts[i]||0;
                      const isRec=i===aiRecommendedStyleIdx;
                      return(
                        <div key={i} style={{flex:"1 0 40%",padding:"5px 8px",borderRadius:8,background:isRec?"#52C41A":"#F5F5F5",border:`1.5px solid ${isRec?"#52C41A":"#d9d9d9"}`}}>
                          <div style={{fontSize:10.5,fontWeight:isRec?700:400,color:isRec?"#fff":"#333"}}>{s}{isRec&&" ⭐"}</div>
                          <div style={{fontSize:10,color:isRec?"rgba(255,255,255,0.8)":"#999",marginTop:1}}>使用 {cnt} 次</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{fontSize:10.5,color:"#52C41A",fontWeight:600}}>
                    🤖 Q仔推荐：「{["温柔学姐风","毒舌室友风","佛系朋友风","正经班委风"][aiRecommendedStyleIdx]}」（{reminderStyleCounts[aiRecommendedStyleIdx]}/{totalStyleUses}次）
                  </div>
                </div>

                {/* 📚 Q仔学习日志（新增）*/}
                <div style={{background:"#FAFBFD",border:"1px solid #E5E8EE",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#666",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    📚 Q仔学习日志
                    {allLearnLog.filter(l=>l.time!=="历史").length>0&&<span style={{fontSize:9,background:"#52C41A",color:"#fff",padding:"1px 5px",borderRadius:6}}>本次会话 +{allLearnLog.filter(l=>l.time!=="历史").length}</span>}
                  </div>
                  {allLearnLog.slice(0,10).map((l,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:6,padding:"5px 8px",background:l.time!=="历史"?"#F0FFF4":"transparent",borderRadius:6,border:l.time!=="历史"?"1px solid #B7EB8F":"none"}}>
                      <span style={{fontSize:12,flexShrink:0}}>{"icon" in l?(l as LearningEntry).icon:"✓"}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,color:"#333",lineHeight:1.4}}>{l.content}</div>
                        <div style={{fontSize:10,color:"#bbb",marginTop:1}}>{l.time}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{fontSize:10,color:"#bbb",marginTop:4,textAlign:"center"}}>每次你确认/调整/忽略，Q仔都会学习</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>

    {/* ══════════════════════════════════════════════════════
        演示控制条（重构为3模块）
    ══════════════════════════════════════════════════════ */}
    <div style={{position:"fixed",left:demoBarPos.x,bottom:demoBarPos.y,background:"rgba(255,255,255,0.97)",border:"1px solid #E5E5E5",borderRadius:18,padding:"8px 14px",display:"flex",flexDirection:"column",gap:6,alignItems:"stretch",boxShadow:"0 8px 32px rgba(0,0,0,0.12)",zIndex:1000,userSelect:"none"}}>
      <div onMouseDown={e=>setDemoBarDrag({startX:e.clientX,startY:e.clientY,origX:demoBarPos.x,origY:demoBarPos.y})}
        style={{cursor:demoBarDrag?"grabbing":"grab",alignSelf:"center",padding:"2px 6px",fontSize:13,color:"#999",display:"flex",alignItems:"center",gap:4}}>
        🎮 <span style={{fontSize:10,color:"#bbb"}}>演示控制台</span>
      </div>
      {/* 模块一：智能检索 */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:10,color:"#4A90D9",fontWeight:700,width:68,flexShrink:0}}>🔍 一·记忆</span>
        <div style={{display:"flex",gap:4}}>
          <button onClick={simSmartSearch} style={{padding:"5px 10px",borderRadius:10,border:"1.5px solid #4A90D955",background:"#4A90D915",color:"#4A90D9",fontSize:11,fontWeight:600,cursor:"pointer"}}>智能检索</button>
        </div>
      </div>
      {/* 模块二：智能排期 */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:10,color:"#FA8C16",fontWeight:700,width:68,flexShrink:0}}>📋 二·行动</span>
        <div style={{display:"flex",gap:4}}>
          <button onClick={simGroupSetup} style={{padding:"5px 10px",borderRadius:10,border:"1.5px solid #FA8C1655",background:"#FA8C1615",color:"#FA8C16",fontSize:11,fontWeight:600,cursor:"pointer"}}>授权设置</button>
          <button onClick={simDDL} style={{padding:"5px 10px",borderRadius:10,border:"1.5px solid #FA8C1655",background:"#FA8C1615",color:"#FA8C16",fontSize:11,fontWeight:600,cursor:"pointer"}}>自动抓取</button>
          <button onClick={simCrossAnalysis} style={{padding:"5px 10px",borderRadius:10,border:"1.5px solid #9B59B655",background:"#9B59B615",color:"#9B59B6",fontSize:11,fontWeight:600,cursor:"pointer"}}>跨群分析</button>
        </div>
      </div>
      {/* 模块三：协作分析 */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:10,color:"#36CFC9",fontWeight:700,width:68,flexShrink:0}}>🤝 三·协作</span>
        <div style={{display:"flex",gap:4}}>
          <button onClick={simCollabAnalysis} style={{padding:"5px 10px",borderRadius:10,border:"1.5px solid #36CFC955",background:"#36CFC915",color:"#36CFC9",fontSize:11,fontWeight:600,cursor:"pointer"}}>协作分析</button>
        </div>
      </div>
    </div>

    {/* 快进按钮 */}
    <div style={{position:"fixed",right:16,bottom:90,zIndex:1002,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      {reminderConfig&&<div style={{background:"#52C41A",color:"#fff",fontSize:9.5,fontWeight:700,padding:"2px 7px",borderRadius:8,whiteSpace:"nowrap"}}>提醒已设定 {reminderConfig.sendTime}</div>}
      <button onClick={()=>{
        if(timeJumped)return;
        const rc=reminderConfig||{styleIdx:aiRecommendedStyleIdx,sendTime:"21:00",evId:7,evTitle:"📎 计网作业截止"};
        const ev=schedule.find(e=>e.id===rc.evId)||schedule.find(e=>e.title.includes("计网"))||null;
        const styleNames=["温柔学姐","毒舌室友","佛系朋友","正经班委"];
        const sname=styleNames[rc.styleIdx]||"毒舌室友";
        const styleText=ev?(getReminderStyles(ev)[rc.styleIdx]?.text||`提醒：「${rc.evTitle}」今日截止！`):`提醒：「${rc.evTitle}」截止今日 23:59！`;
        setTimeJumped(true);setActiveChat(9);setUnreadMap(p=>({...p,9:0}));
        showToast(`⏩ 时间快进至 5月6日 ${rc.sendTime}`,"#7B68EE");
        setTimeout(()=>{
          const nm:Message={id:Date.now(),sender:"Q仔",isAI:true,content:`⏰【自动提醒 · ${sname}风】\n\n${styleText}\n\n──\n📅 发送时间：5月6日 ${rc.sendTime}\n🤖 提醒风格由 Q仔 根据响应历史自动选择`,time:rc.sendTime,self:false,date:"5月6日 周三"};
          setMessages(p=>({...p,9:[...(p[9]||[]),nm]}));
          setAlertBanner(true);
        },600);
      }} style={{width:60,height:60,borderRadius:"50%",background:timeJumped?"#8C8C8C":"linear-gradient(135deg,#FF6B6B,#FF4D4F)",color:"#fff",border:"none",cursor:timeJumped?"default":"pointer",boxShadow:`0 4px 20px ${timeJumped?"rgba(0,0,0,0.15)":"rgba(255,77,79,0.5)"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
        <span style={{fontSize:18}}>⏩</span>
        <span style={{fontSize:9,fontWeight:700}}>{timeJumped?"已快进":"快进"}</span>
      </button>
      <div style={{fontSize:9,color:"#999",textAlign:"center",lineHeight:1.3}}>快进至<br/>5月6日</div>
    </div>

    {/* ══════════════════════════════════════════════════════
        弹窗区
    ══════════════════════════════════════════════════════ */}

    {/* ── 群组权限设置弹窗（新增）── */}
    {showGroupSetup&&setupGroupId!==null&&(()=>{
      const chat=CHATS.find(c=>c.id===setupGroupId);
      const isOn=monitoredGroups.has(setupGroupId);
      return(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setShowGroupSetup(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:"24px",width:400,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
              <div style={{width:40,height:40,borderRadius:8,background:chat?.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff"}}>{chat?.avatar}</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#333"}}>{chat?.name}</div>
                <div style={{fontSize:11,color:"#999"}}>⚙️ Q仔权限设置</div>
              </div>
            </div>
            <div style={{background:"#F0F7FF",border:"1.5px solid #BAE0FF",borderRadius:12,padding:"14px 16px",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#333"}}>开启 Q仔 自动监听</div>
                  <div style={{fontSize:11,color:"#666",marginTop:2}}>开启后，Q仔 将在此群内自动识别 DDL、调课、活动等信息</div>
                </div>
                {/* 开关 */}
                <div onClick={()=>toggleMonitor(setupGroupId)} style={{width:44,height:24,borderRadius:12,background:isOn?"#1677FF":"#d9d9d9",cursor:"pointer",position:"relative",transition:"background 0.3s",flexShrink:0}}>
                  <div style={{position:"absolute",top:3,left:isOn?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"left 0.3s"}}/>
                </div>
              </div>
              {isOn&&(
                <div style={{fontSize:10.5,color:"#1677FF",background:"#E6F4FF",padding:"4px 8px",borderRadius:6,display:"flex",alignItems:"center",gap:4}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:"#1677FF",display:"inline-block"}}/>
                  Q仔 仅读取你明确授权的群聊，不监听其他内容
                </div>
              )}
            </div>
            <div style={{background:"#FFFBE6",border:"1px solid #FFE58F",borderRadius:8,padding:"8px 12px",marginBottom:16}}>
              <div style={{fontSize:10.5,color:"#666",lineHeight:1.6}}>
                🔒 <strong>隐私说明</strong>：Q仔 不读取所有聊天，仅处理你授权的群聊内容。所有数据在用户确认前不写入任何系统。
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveGroupSetup} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#1677FF,#4A90D9)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>保存设置</button>
              <button onClick={()=>setShowGroupSetup(false)} style={{padding:"10px 16px",borderRadius:10,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>取消</button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* ── 冲突解决 Q仔建议弹窗（新增）── */}
    {showConflictSuggest&&conflictSuggestion&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setShowConflictSuggest(false)}>
        <div style={{background:"#fff",borderRadius:16,padding:"24px",width:420,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:15,fontWeight:800,color:"#FF4D4F",marginBottom:4}}>⚠️ 时间冲突 · Q仔建议</div>
          <div style={{fontSize:11,color:"#999",marginBottom:16}}>基于你的优先级偏好，Q仔给出以下建议</div>
          {/* Q仔建议 */}
          <div style={{background:"linear-gradient(135deg,#F3E5F5,#E8F0FE)",border:"1.5px solid #D3B8E0",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{width:24,height:24,borderRadius:6,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>Q</div>
              <div style={{fontSize:13,fontWeight:700,color:"#7B68EE"}}>🤖 Q仔的建议</div>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11.5,color:"#666",marginBottom:6}}>建议<strong style={{color:"#52C41A"}}>保留</strong>：</div>
              <div style={{padding:"6px 10px",background:"#F6FFED",border:"1px solid #95DE64",borderRadius:8,fontSize:12.5,fontWeight:600,color:"#333"}}>{conflictSuggestion.keep}</div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11.5,color:"#666",marginBottom:6}}>建议<strong style={{color:"#FF4D4F"}}>取消</strong>：</div>
              <div style={{padding:"6px 10px",background:"#FFF1F0",border:"1px solid #FFA39E",borderRadius:8,fontSize:12.5,fontWeight:600,color:"#333"}}>{conflictSuggestion.cancel}</div>
            </div>
            <div style={{background:"#fff",border:"1px solid #E8EEFA",borderRadius:8,padding:"6px 10px",fontSize:10.5,color:"#8B9ABF",fontStyle:"italic",lineHeight:1.5}}>
              🤖 推理依据：{conflictSuggestion.reason}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={handleConflictAccept} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#52C41A,#73D13D)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✅ 接受建议</button>
            <button onClick={()=>{setShowConflictSuggest(false);showToast("📝 你可以手动在代办卡片下方确认/忽略","#666");}} style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>🔄 我来决定</button>
          </div>
          <div style={{fontSize:10,color:"#bbb",textAlign:"center",marginTop:8}}>接受建议后 Q仔 将记录此次偏好，下次自动参考</div>
        </div>
      </div>
    )}

    {/* ── 智能提醒弹窗 ── */}
    {reminderEv&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>{setReminderEv(null);setSentReminder(false);}}>
        <div style={{background:"#fff",borderRadius:16,padding:"26px",width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:15,fontWeight:800,color:"#333",marginBottom:4}}>💬 生成提醒文案</div>
          <div style={{fontSize:12,color:"#4A90D9",background:"#EFF6FF",padding:"6px 10px",borderRadius:8,marginBottom:10,fontWeight:500}}>
            针对：{reminderEv.title}　{reminderEv.date.slice(5).replace("-","/")} {reminderEv.startTime}
          </div>
          {/* AI预选推荐横幅 */}
          <div style={{background:"linear-gradient(135deg,#F0F7FF,#F3E5F5)",border:"1.5px solid #BAE0FF",borderRadius:10,padding:"8px 12px",marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
            <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>Q</div>
            <div style={{fontSize:11,color:"#555",lineHeight:1.5}}>
              <div style={{fontSize:11.5,fontWeight:700,color:"#4A90D9",marginBottom:2}}>🤖 Q仔智能推荐</div>
              根据你过去 {totalStyleUses} 次提醒记录，「<strong style={{color:"#7B68EE"}}>{["温柔学姐风","毒舌室友风","佛系朋友风","正经班委风"][aiRecommendedStyleIdx]}</strong>」响应率最高（{reminderStyleCounts[aiRecommendedStyleIdx]}/{totalStyleUses}次），已为你预选。
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            {remStyles.map((s,i)=>(
              <button key={i} onClick={()=>{setSelStyle(i);setReminderStyleCounts(p=>({...p,[i]:(p[i]||0)+1}));}} style={{padding:"5px 10px",borderRadius:10,border:`1.5px solid ${selStyle===i?"#4A90D9":"#E5E8EE"}`,background:selStyle===i?"#E8F0FE":"#fff",color:selStyle===i?"#4A90D9":"#666",fontSize:11.5,cursor:"pointer",fontWeight:selStyle===i?700:400,position:"relative"}}>
                {s.icon} {s.label}
                {i===aiRecommendedStyleIdx&&<span style={{position:"absolute",top:-6,right:-6,fontSize:9,background:"#7B68EE",color:"#fff",padding:"1px 4px",borderRadius:6,fontWeight:700}}>AI荐</span>}
              </button>
            ))}
          </div>
          <div style={{background:"#F8F9FB",border:"1px solid #E5E8EE",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#333",lineHeight:1.6,marginBottom:12,minHeight:64}}>{remStyles[selStyle]?.text}</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#555",fontWeight:600,marginBottom:7}}>⏰ 选择提醒时间</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
              {(["1h","3h","custom"] as const).map(opt=>{
                const lbs={"1h":"截止前1小时","3h":"截止前3小时","custom":"自定义时间"};
                return(
                  <button key={opt} onClick={()=>setReminderTimeOpt(opt)} style={{padding:"4px 10px",borderRadius:8,border:`1.5px solid ${reminderTimeOpt===opt?"#4A90D9":"#E5E8EE"}`,background:reminderTimeOpt===opt?"#E8F0FE":"#fff",color:reminderTimeOpt===opt?"#4A90D9":"#666",fontSize:11,cursor:"pointer",fontWeight:reminderTimeOpt===opt?700:400}}>{lbs[opt]}</button>
                );
              })}
            </div>
            {reminderTimeOpt==="custom"&&(
              <input type="time" value={reminderCustomT} onChange={e=>setReminderCustomT(e.target.value)} style={{height:32,padding:"0 8px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333",marginBottom:5}}/>
            )}
            <div style={{fontSize:11,color:"#999",marginTop:2}}>
              将于 <strong style={{color:"#4A90D9"}}>{computeSendTime(reminderTimeOpt,reminderCustomT,reminderEv)}</strong> 自动发送
            </div>
          </div>
          {!sentReminder?(
            <button onClick={()=>{
              const st=computeSendTime(reminderTimeOpt,reminderCustomT,reminderEv!);
              setReminderConfig({styleIdx:selStyle,sendTime:st,evId:reminderEv!.id,evTitle:reminderEv!.title});
              setSentReminder(true);
              const styleNames=["温柔学姐风","毒舌室友风","佛系朋友风","正经班委风"];
              const now=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
              setAiLearnLog(p=>[...p,{from:"",to:styleNames[selStyle],title:"提醒风格选择",time:now}]);
            }} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>一键设定提醒</button>
          ):(
            <div style={{textAlign:"center",padding:"10px 0"}}>
              <div style={{color:"#52C41A",fontWeight:700,fontSize:14}}>✅ 提醒已设定！将于 <span style={{color:"#4A90D9"}}>{reminderConfig?.sendTime}</span> 自动发送</div>
              <div style={{marginTop:8,background:"linear-gradient(135deg,#F3E5F5,#E8F0FE)",border:"1px solid #D3B8E0",borderRadius:8,padding:"6px 12px",fontSize:11,color:"#7B68EE",lineHeight:1.5}}>
                ✨ Q仔已记录：你选择了「{["温柔学姐风","毒舌室友风","佛系朋友风","正经班委风"][selStyle]}」，下次同类提醒将优先推荐
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* ── 添加/编辑日程弹窗 ── */}
    {showEvModal&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setShowEvModal(false)}>
        <div style={{background:"#fff",borderRadius:16,padding:"24px",width:400,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:18}}>{editingEv?"✏️ 编辑日程":"+ 添加日程"}</div>
          {([{label:"标题",key:"title",type:"text"},{label:"日期",key:"date",type:"date"},{label:"开始时间",key:"startTime",type:"time"},{label:"结束时间",key:"endTime",type:"time"},{label:"地点（选填）",key:"location",type:"text"}] as {label:string;key:string;type:string}[]).map(field=>(
            <div key={field.key} style={{marginBottom:12}}>
              <div style={{fontSize:12,color:"#666",marginBottom:4}}>{field.label}</div>
              <input type={field.type} value={(evForm as Record<string,string>)[field.key]} onChange={e=>setEvForm(p=>({...p,[field.key]:e.target.value}))} style={{width:"100%",height:34,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333",boxSizing:"border-box"}}/>
            </div>
          ))}
          <div style={{display:"flex",gap:12,marginBottom:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:"#666",marginBottom:4}}>类型</div>
              <select value={evForm.type} onChange={e=>setEvForm(p=>({...p,type:e.target.value as ScheduleEvent["type"]}))} style={{width:"100%",height:34,padding:"0 8px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333"}}>
                <option value="class">课程</option><option value="task">任务/DDL</option><option value="event">活动</option><option value="exam">考试/答辩</option><option value="travel">出行</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:"#666",marginBottom:4}}>优先级</div>
              <select value={evForm.priority} onChange={e=>setEvForm(p=>({...p,priority:e.target.value as Priority}))} style={{width:"100%",height:34,padding:"0 8px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333"}}>
                <option value="high">🔴 紧急</option><option value="medium">🟠 重要</option><option value="low">🟡 一般</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveEv} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>保存</button>
            <button onClick={()=>setShowEvModal(false)} style={{padding:"10px 18px",borderRadius:10,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>取消</button>
          </div>
        </div>
      </div>
    )}

    {/* ── 导入日程弹窗 ── */}
    {showImportModal&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setShowImportModal(false)}>
        <div style={{background:"#fff",borderRadius:16,padding:"24px",width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:6}}>📥 导入日程/课表</div>
          <div style={{fontSize:12,color:"#999",marginBottom:18}}>支持图片识别、文件上传、教务系统直连</div>
          {importStep==="choose"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[{icon:"🖼️",label:"图片识别",desc:"上传课表截图\nAI 识别课程",color:"#4A90D9"},{icon:"📄",label:"PDF / Word",desc:"上传课表文件\n自动解析",color:"#FA8C16"},{icon:"🏫",label:"教务系统",desc:"账号密码登录\n直接同步",color:"#52C41A"},{icon:"📆",label:"iCal日历",desc:"日历同步\n一键导入",color:"#9B59B6"}].map(opt=>(
                <button key={opt.label} onClick={()=>handleImport(opt.label)} style={{padding:"14px 12px",borderRadius:10,border:`1.5px solid ${opt.color}55`,background:`${opt.color}10`,color:"#333",cursor:"pointer",textAlign:"left"}}>
                  <div style={{fontSize:24,marginBottom:4}}>{opt.icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:opt.color,marginBottom:3}}>{opt.label}</div>
                  <div style={{fontSize:10.5,color:"#666",lineHeight:1.4,whiteSpace:"pre-line"}}>{opt.desc}</div>
                </button>
              ))}
            </div>
          )}
          {importStep==="loading"&&(
            <div style={{padding:"30px 0",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:12}}>⏳</div>
              <div style={{fontSize:14,fontWeight:700,color:"#333",marginBottom:6}}>正在通过{importMethod}导入…</div>
              <div style={{fontSize:11,color:"#999"}}>识别课程信息中，请稍候</div>
            </div>
          )}
          {importStep==="done"&&(
            <div style={{padding:"20px 0",textAlign:"center"}}>
              <div style={{fontSize:38,marginBottom:10}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:"#52C41A",marginBottom:6}}>导入成功！</div>
              <div style={{fontSize:11.5,color:"#666",marginBottom:18}}>已通过 {importMethod} 导入 4 节课程到日程表</div>
              <button onClick={()=>setShowImportModal(false)} style={{padding:"10px 32px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#52C41A,#73D13D)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>查看日程</button>
            </div>
          )}
        </div>
      </div>
    )}

    {/* ── 敏感信息解锁弹窗 ── */}
    {sensitiveCapId!==null&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:4000}} onClick={()=>{setSensitiveCapId(null);setSensitiveInput("");}}>
        <div style={{background:"#fff",borderRadius:16,padding:"26px",width:360,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:6}}>🔐 敏感信息保护</div>
          <div style={{background:"#F5F5F5",border:"1px solid #E5E8EE",borderRadius:8,padding:"8px 10px",marginBottom:12}}>
            <div style={{fontSize:10.5,color:"#666",lineHeight:1.5}}>
              🤖 Q仔已对该内容进行本地 AES-256 加密存储。云端仅存储指针，无法还原实际内容。请输入访问密码查看。
            </div>
          </div>
          <input type="password" value={sensitiveInput} autoFocus onChange={e=>setSensitiveInput(e.target.value)}
            onKeyDown={e=>{
              if(e.key!=="Enter")return;
              if(sensitiveInput==="666"){setUnlockedCaps(p=>new Set([...p,sensitiveCapId!]));setSensitiveCapId(null);setSensitiveInput("");showToast("🔓 验证通过，账号密码已显示","#52C41A");}
              else{showToast("❌ 密码错误","#FF4D4F");}
            }}
            placeholder="输入访问密码…"
            style={{width:"100%",height:42,padding:"0 12px",border:"1.5px solid #E5E8EE",borderRadius:8,fontSize:14,outline:"none",color:"#333",boxSizing:"border-box",marginBottom:16}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{
              if(sensitiveInput==="666"){setUnlockedCaps(p=>new Set([...p,sensitiveCapId!]));setSensitiveCapId(null);setSensitiveInput("");showToast("🔓 已解锁","#52C41A");}
              else{showToast("❌ 密码错误","#FF4D4F");}
            }} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>确认解锁</button>
            <button onClick={()=>{setSensitiveCapId(null);setSensitiveInput("");}} style={{padding:"10px 16px",borderRadius:10,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>取消</button>
          </div>
          <div style={{fontSize:11,color:"#bbb",textAlign:"center",marginTop:10}}>演示密码：666</div>
        </div>
      </div>
    )}

    {/* ── 编辑优先级条目弹窗 ── */}
    {editingPItem&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setEditingPItem(null)}>
        <div style={{background:"#fff",borderRadius:16,padding:"24px",width:380,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:15,fontWeight:800,color:"#333",marginBottom:4}}>✏️ 调整优先级</div>
          <div style={{background:"linear-gradient(135deg,#F3E5F5,#E8F0FE)",border:"1px solid #D3B8E0",borderRadius:8,padding:"6px 10px",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:14}}>✨</span>
            <span style={{fontSize:10.5,color:"#7B68EE",lineHeight:1.4}}>修改后 Q仔会记录你的偏好，下次遇到同类任务会自动参考此调整</span>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:"#666",marginBottom:4}}>事项名称</div>
            <input value={editingPItem.title} onChange={e=>setEditingPItem(p=>p?{...p,title:e.target.value}:null)} style={{width:"100%",height:34,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333",boxSizing:"border-box"}}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#666",marginBottom:8}}>调整优先级</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{l:"紧急",e:"🔴",c:"#FF4D4F"},{l:"重要",e:"🟠",c:"#FA8C16"},{l:"一般",e:"🟡",c:"#FAAD14"},{l:"已确认",e:"🟢",c:"#52C41A"},{l:"方案参考",e:"🔵",c:"#3B82F6"}].map(opt=>(
                <button key={opt.l} onClick={()=>setEditingPItem(p=>p?{...p,level:opt.l}:null)}
                  style={{padding:"6px 12px",borderRadius:10,border:`2px solid ${editingPItem.level===opt.l?opt.c:"#E5E8EE"}`,background:editingPItem.level===opt.l?`${opt.c}15`:"#fff",color:editingPItem.level===opt.l?opt.c:"#666",fontSize:12,fontWeight:editingPItem.level===opt.l?700:400,cursor:"pointer"}}>
                  {opt.e} {opt.l}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{
              if(!editingPItem)return;
              const colorMap2:Record<string,string>={紧急:"#FF4D4F",重要:"#FA8C16",一般:"#FAAD14",方案参考:"#3B82F6",已确认:"#52C41A",敏感:"#8C8C8C"};
              const origOverride=priorityOverrides[editingPItem.id];
              if(origOverride!==editingPItem.level){
                const now=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
                setAiLearnLog(p=>[...p,{from:origOverride||"AI推荐",to:editingPItem.level,title:editingPItem.title,time:now}]);
                showToast(`✨ Q仔已记录：将「${editingPItem.title.slice(0,10)}」调为${editingPItem.level}`,"#7B68EE");
              } else {showToast("✅ 已保存","#52C41A");}
              setPriorityOverrides(p=>({...p,[editingPItem.id]:editingPItem.level}));
              setEditingPItem(null);
            }} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>保存 · Q仔记录此偏好</button>
            <button onClick={()=>setEditingPItem(null)} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>取消</button>
          </div>
        </div>
      </div>
    )}

    {/* ── 全局样式 ── */}
    <style>{`
      ::-webkit-scrollbar { width: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #D9DCE0; border-radius: 4px; }
      input::placeholder { color: #BFBFBF; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
  </div>
);
}

