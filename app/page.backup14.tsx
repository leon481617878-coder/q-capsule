"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

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

// ── 老师画像数据 ──────────────────────────────────────────
const TEACHER_PROFILES: Record<string,{icon:string;label:string;color:string;detail:string}> = {
  "张老师":      {icon:"⚠️", label:"从不延期",        color:"#FF4D4F", detail:"本学期已发出3次DDL提醒，本次措辞紧迫度↑，历史上从不接受补交"},
  "翁一士":      {icon:"📊", label:"重视过程",         color:"#7B68EE", detail:"喜欢看中间数据与实验过程，缺席需提前告知"},
  "李老师":      {icon:"💡", label:"偏宽松",           color:"#52C41A", detail:"DDL通常可协商，更关注报告质量"},
  "大赛官助sasa":{icon:"🏆", label:"官方通知·严格执行",color:"#FA8C16", detail:"官方渠道，截止时间严格执行，无例外"},
  "队友 周":     {icon:"🔥", label:"积极催促·截止意识强",color:"#FF6B6B",detail:"主动提醒团队DDL，执行力强"},
  "助教 陈学长": {icon:"📋", label:"规则清晰",          color:"#4A90D9", detail:"规则说明清晰，不接受补交"},
};

// ── AI 推理理由生成 ───────────────────────────────────────
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
  if(title.includes("重庆")||title.includes("出行")||title.includes("航班"))
    return "出行计划已确认 · Q仔持续监控MU5435航班状态 · 发现变更立即通知";
  if(title.includes("班费")||title.includes("团建"))
    return "班级活动 · 可协商 · Q仔判断不影响学业核心任务";
  if(level==="已确认") return "已写入日程，Q仔将在截止前按你偏好风格自动提醒";
  if(level==="方案参考") return "来自群讨论总结，供规划参考，无需强制确认";
  return "综合事件类型、截止远近与本周任务密度判断";
};

// ── Q仔用户画像数据（模拟AI学习结果）────────────────────
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
    {id:9,sender:"幻想国",content:"+1 我们也缺个产品",time:"15:52",self:false},
    {id:10,sender:"system",content:"云上枫加入了群聊",time:"15:08",self:false,isSystem:true,date:"4月25日 周五"},
    {id:11,sender:"云上枫",content:"大家好！请问这次比赛的评分维度有几个？",time:"15:10",self:false},
    {id:12,sender:"大赛官助sasa",content:"评分维度共5个：用户洞察（20%）、产品方案（30%）、AI原生能力（25%）、落地可行性（15%）、创新差异化（10%）",time:"15:12",self:false},
    {id:13,sender:"陈同学",content:"请问可以个人参赛还是必须组队",time:"09:10",self:false,date:"今天"},
    {id:14,sender:"大赛官助小刘",content:"鼓励1-3人组队，也支持1人参赛",time:"09:15",self:false},
    {id:15,sender:"你",content:"请问需要提交代码吗还是只要Demo就够了",time:"10:20",self:true},
    {id:16,sender:"大赛官助sasa",content:"@你 Demo可以是视频演示、交互原型或可运行代码，形式不限",time:"10:22",self:false},
    {id:17,sender:"Lena_p",content:"有没有做校园场景的同学，可以交流一下思路吗",time:"11:00",self:false},
    {id:18,sender:"你",content:"@Lena_p 我也是做校园方向的，可以加个好友",time:"11:05",self:true},
  ],
  2:[
    {id:1,sender:"翁一士",content:"今天王闯这边会把图纸出了给到你们 @😇 @Monica 周六师妹们辛苦一下 把这周做的片子除膜除了",time:"09:32",self:false,date:"4月25日 周五"},
    {id:2,sender:"Monica",content:"收到",time:"09:35",self:false},
    {id:3,sender:"😇",content:"除完直接装板子寄吗",time:"09:40",self:false},
    {id:4,sender:"翁一士",content:"之前有寄过来那种塑料的大板子\n可以放那个里面寄",time:"09:42",self:false},
    {id:5,sender:"王闯",content:"下周三16:30开一次组会，请要展示的同学做好准备",time:"10:15",self:false},
    {id:6,sender:"Monica",content:"OK 好的 辛苦了[强]",time:"10:38",self:false},
    {id:7,sender:"翁一士",content:"@Yishi @王莉莉 @仲雪飞 三位老师好，五一期间，411/416有没有实验室要开展实验活动？",time:"14:20",self:false,date:"4月27日 周日"},
    {id:8,sender:"你",content:"xitai的片子是同一天做的吗？@哩哩",time:"15:00",self:true},
    {id:9,sender:"哩哩（刘黎黎）",content:"不是同一天，曝光是两个人，同一天仅一个人曝光",time:"15:08",self:false},
    {id:10,sender:"你",content:"横向周期设计的多少，有测过吗？",time:"15:15",self:true},
    {id:11,sender:"哩哩（刘黎黎）",content:"412nm的横向周期",time:"15:20",self:false},
    {id:12,sender:"你",content:"入和出横向周期为什么会差啊？",time:"15:22",self:true},
    {id:13,sender:"哩哩（刘黎黎）",content:"我也没想明白，下面的载具可以旋转0.5度",time:"15:35",self:false},
    {id:14,sender:"翁一士",content:"明日组会线上[旺柴][强]",time:"16:20",self:false,date:"今天"},
    {id:15,sender:"王闯",content:"[旺柴][强]",time:"16:21",self:false},
    {id:16,sender:"MMMN",content:"光阑是松的 动了光阑后 光斑位置变了",time:"16:25",self:false},
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
    {id:9,sender:"张师兄",content:"先做出来再说，不好再迭代嘛",time:"14:34",self:false},
    {id:10,sender:"你",content:"嗯嗯，那组会要不要展示中间过程的数据",time:"14:35",self:true},
    {id:11,sender:"张师兄",content:"展示一下吧，翁老师喜欢看过程",time:"14:36",self:false},
    {id:12,sender:"你",content:"ok收到！",time:"14:37",self:true},
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
    {id:7,sender:"赵同学",content:"请问编程题要不要测试用例截图",time:"11:20",self:false},
    {id:8,sender:"助教 陈学长",content:"需要！要展示三次握手的完整过程输出",time:"11:22",self:false},
    {id:9,sender:"张老师",content:"📢 重要通知：本周四（4月30日）下午的课调到 教三-204，时间不变下午14:00开始",time:"14:00",self:false,date:"4月28日 周一"},
    {id:10,sender:"你",content:"收到",time:"14:05",self:true},
    {id:11,sender:"张老师",content:"再次提醒：第三章课后作业本周三（5月6日）23:59前提交，word格式，不少于3000字，发到课程邮箱，并同步提交到学习通平台",time:"14:20",self:false,date:"今天"},
    {id:12,sender:"助教 陈学长",content:"补充：不接受补交，请大家务必提前完成",time:"14:22",self:false},
    {id:13,sender:"钱同学",content:"老师，学习通是提交word还是pdf",time:"14:25",self:false},
    {id:14,sender:"张老师",content:"@钱同学 word即可，不用再转pdf",time:"14:26",self:false},
    {id:15,sender:"周同学",content:"感谢老师！",time:"14:27",self:false},
  ],
  5:[
    {id:1,sender:"李老师",content:"🌟 本周实验：实现红黑树的插入、删除与查找操作",time:"08:30",self:false,date:"4月21日 周一"},
    {id:2,sender:"助教",content:"[文件] 实验报告模板.docx",time:"08:32",self:false},
    {id:3,sender:"刘同学",content:"老师，红黑树的旋转操作可以画图说明吗？",time:"10:15",self:false},
    {id:4,sender:"李老师",content:"可以，建议使用draw.io或者手绘扫描",time:"10:20",self:false},
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
  20:[
    {id:1,sender:"陈晓雨",content:"你好，关于下个月的五四主题晚会方案，想和你对一下思路",time:"14:00",self:false,date:"4月28日 周一"},
    {id:6,sender:"你",content:"可以做一个「青春知识闯关」——历史知识竞答+抢答",time:"14:13",self:true},
    {id:16,sender:"你",content:"我把刚才聊的让Q仔总结了一下，共享给你",time:"14:42",self:true},
    {id:17,sender:"陈晓雨",content:"收到了！这个总结超全 🎉",time:"14:45",self:false},
    {id:20,sender:"陈晓雨",content:"那这个互动环节怎么设计",time:"16:45",self:false},
  ],
  21:[
    {id:1,sender:"室友 老钱",content:"我觉得你最近把宿舍公共区域搞得太乱了",time:"21:00",self:false,date:"昨天"},
    {id:15,sender:"室友 老钱",content:"……好，那我们先冷静一下吧，但公共区域的事情要解决",time:"21:30",self:false},
    {id:16,sender:"你",content:"同意。我让Q仔帮我分析了一下，共享给你",time:"21:35",self:true},
    {id:20,sender:"室友 老钱",content:"我觉得你理解有误，是我觉得Q仔说的「两人均有道理」太圆滑了",time:"21:50",self:false},
  ],
};

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
  {id:103,type:"conflict",importance:"high",  group:"摄影社 × 课题组",   title:"⚠️ 周日下午时间冲突",content:"周日14:30 摄影外拍（情人谷集合）\n周日15:00 课题组小会议\n两者不可兼得",  time:"16:32",from:"AI 检测", new:true, createdAt:TODAY},
  {id:104,type:"plan",    importance:"low",   group:"小美 💕",             title:"🗺️ 重庆出行已确定", content:"✅ 5月10日 09:30 飞机出发\n👥 你 + 小美\n✈️ MU5435 南京→重庆",                  time:"15:30",from:"AI 总结", new:false,createdAt:TODAY},
  {id:105,type:"pending", importance:"high",  group:"Team Phoenix",       title:"🔥 初赛截止 5/6",   content:"PPT + Demo视频 + 申报书\n建议5/5前定稿留出buffer\n⏰ 还剩7天！",          time:"13:01",from:"队友 周", new:true, createdAt:TODAY,scheduleData:{date:"2026-05-06",startTime:"23:00",endTime:"23:59",title:"🔥 创新赛初赛截止",type:"task",color:"#FFF1F0",priority:"high"}},
  {id:106,type:"pending", importance:"high",  group:"王老师课题组",        title:"🔬 今日组会 16:30", content:"4月29日 16:30-19:30\n腾讯会议线上",                                       time:"16:32",from:"翁一士",  new:true, createdAt:TODAY,scheduleData:{date:"2026-04-29",startTime:"16:30",endTime:"19:30",title:"🔬 课题组组会(线上)",type:"event",color:"#F9F0FF",priority:"high"}},
];

const AI_SUM:Record<number,string>={
  1: "📋 **对话总结（PCG大赛群）**\n\n• 提交：PPT（≤20页）+ Demo视频（≤5分钟）\n• 报名截止：5月10日，初赛提交：5月20日\n• 评分5维度：用户洞察/产品方案/AI能力/落地/创新\n\n📌 **待办**\n1. 报名截止 5月10日\n2. Demo视频准备",
  2: "📋 **对话总结（课题组）**\n\n• 今日重点：16:30 腾讯会议组会\n• 实验进展：横向周期偏差10nm\n\n📌 **待办**\n1. ⚡ 今天16:30参加腾讯会议\n2. 整理彩色样品进展",
  3: "📋 **对话总结（张师兄）**\n\n• 实验：曝光量调整建议（150→180mJ/cm²）\n• 师兄分享了张老师教务系统账号密码（用于研讨室预约）\n• ⚠️ 涉及隐私信息，已加密存入代办\n\n📌 **待办**\n1. 调整曝光参数重做实验\n2. 用账号预约211研讨室（需密码解锁查看）",
  4: "📋 **对话总结（计网群）**\n\n• ⚡ 第三章作业DDL：5月6日23:59\n• 作业：Word格式，3000字，学习通+邮箱双提交\n• 地点变更：4月30日课改到教三-204\n\n📌 **紧急待办**\n1. ⚡ 计网作业（还有7天）\n2. 周四注意换教室",
  9: "📋 **对话总结（Team Phoenix）**\n\n• 截止：5月6日23:59，还剩7天\n• v3问题：商业模式单薄、用户画像不具体\n\n📌 **紧急待办**\n1. 今晚出PPT v4\n2. 等队友素材（周五截止）",
  10:"📋 **对话总结（队友 刘正昂）**\n\n• PPT框架已完成，竞品对比已收到\n• 调研数据整理中，今晚出第一稿\n\n📌 **待办**\n1. ⚡ 初赛截止 5月6日（还剩7天）\n2. 今晚出PPT第一稿",
  13:"📋 **重庆出行计划总结**\n\n**✅ 已确认：**\n• 出行时间：5月10日（周六）-5月12日（周一）两天一晚\n• 出行方式：✈️ 飞机\n• 去程：MU5435 南京禄口 → 重庆江北 09:30-11:55\n• 回程：MU5436 18:00 起飞\n• 住宿：洪崖洞旁边酒店（已订）\n• 同行：你、小美 2人\n\n**📌 行程建议：**\n1. 火锅+洪崖洞+轻轨穿楼经典三件套\n2. 解放碑/磁器口/长江索道\n\n💡 **Q仔已开启出行监控**\n我会持续跟踪你的航班 MU5435、MU5436 状态、酒店动态、天气变化等信息，一旦有变更（如延误、改签）会自动生成代办通知你。点击聊天中的航班卡片可查看实时状态 ✈️",
  18:"📋 **群体排期分析（计算机协会团建）**\n\n基于 18 位成员回复：\n\n🏆 **最佳时间：**\n① **周六下午 14:00-17:00** — 88%（16/18人）✅\n② 工作日晚上 — 78%\n③ 周日全天 — 67%\n\n⚠️ 小冯5月10号前有项目，建议10号后的周六",
  20:"📋 **五四晚会策划要点总结**\n\n**✅ 已确认：**\n• 三大板块：文艺演出 + 互动游戏 + 颁奖典礼\n• 演出：朗诵×2、舞蹈×1、合唱×1（控制1.5h）\n• 互动：「青春知识闯关」3种题型\n• 趣味奖项：最强卷王/最佳摸鱼/深夜007\n\n**💰 经费（总3000）：**\n• 演出道具800/场地800/奖品700/主持200/备用500\n\n💡 可以共享给策划伙伴一起完善！",
  21:"📋 **对话分析（宿舍矛盾）**\n\n**争议核心：**\n• 老钱：公共区域整洁诉求\n• 你：部分责任归属不清，沟通方式不适\n\n**客观分析：**\n两人均有一定道理。「你太敏感」会关闭对话而非解决问题。\n\n💡 **化解建议：**\n1. 约定公共区域规则（杂物24h内清理）\n2. 沟通时多用「我感觉……」\n3. 先冷静，情绪激动时不谈实质\n\n📤 可以共享这份分析给对方 →",
};

function aiFollowup(q:string,chatId:number):string{
  const lq=q.toLowerCase();
  if(lq.includes("重庆")||lq.includes("火锅")||lq.includes("洪崖洞"))return `🌶️ **重庆游玩推荐**\n\n**第一天（5/10）：**\n• 中午抵达后吃火锅（推荐：朱光玉、珮姐）\n• 下午：洪崖洞观景\n• 晚上：千厮门大桥夜景\n\n**第二天（5/11）：**\n• 上午：磁器口古镇\n• 下午：李子坝轻轨穿楼`;
  if(lq.includes("航班")||lq.includes("飞机")||lq.includes("延误"))return `✈️ **航班实时状态**\n\n**MU5435（去程）⚠️ 状态变更**\n• 南京禄口T2 → 重庆江北T3\n• 计划：5/10 09:30 起飞\n• 实时：**延误40分钟**，预计10:10起飞\n• 登机口：B12\n\n**MU5436（回程）**\n• 5/12 18:00 起飞，状态正常\n\n💡 我会持续监控，有变更立即通知。`;
  if(lq.includes("互动游戏"))return `🎮 **「青春知识闯关」规则**\n\n• 第1轮·个人闯关（5分钟）：10题历史知识\n• 第2轮·队伍竞赛（8分钟）：6支队抢答\n• 第3轮·团队协作（7分钟）：青春拼图`;
  if(lq.includes("ddl")||lq.includes("截止"))return `⏰ **近期DDL**\n\n🔴 紧急（一周内）：\n• 创新赛初赛 → 5月6日\n• 计网作业 → 5月6日\n\n🟡 待关注：\n• 数据结构实验 → 5月15日\n• 操作系统答辩 → 5月7日`;
  if(lq.includes("谁对")||lq.includes("谁正确"))return `⚖️ **客观分析**\n\n两人都有合理之处：\n• 老钱诉求合理：集体生活需要维护共享空间\n• 你的感受也合理：「你太敏感」是否定性表达\n\n这是沟通方式冲突，不是价值观冲突。`;
  if(lq.includes("冲突")||lq.includes("化解"))return `🤝 **化解策略**\n\n• 双方先冷静20分钟\n• 主动认错：「我承认桌子有点乱」\n• 表达感受：「我希望我们更平和地说」\n• 建立规则：杂物24h内清理`;
  const chat=CHATS.find(c=>c.id===chatId);
  return `我理解你问的是「${q}」。基于「${chat?.name||"当前对话"}」，我可以帮你总结、提醒DDL、给行动建议。`;
}

function partnerFirstMsg(chatId:number):string{
  const m:Record<number,string>={
    20:"这份总结超全！经费那块我觉得演出道具可以再压一点",
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

const MODULE_COLORS={
  capsule:"#FA8C16",
  remind: "#7B68EE",
  group:  "#20B2AA",
  social: "#36CFC9",
  insight:"#9B59B6",
};

export default function QCapsuleDemo(){
  const [activeChat,    setActiveChat]    = useState(2);
  const [messages,      setMessages]      = useState(MSGS);
  const [capsules,      setCapsules]      = useState<Capsule[]>(INIT_CAPS);
  const [schedule,      setSchedule]      = useState<ScheduleEvent[]>(INIT_SCH);
  const [unreadMap,     setUnreadMap]     = useState<Record<number,number>>(()=>Object.fromEntries(CHATS.map(c=>[c.id,c.unread])));
  const [newCapIds,     setNewCapIds]     = useState<number[]>([101,102,103,105,106]);
  const [flyingCap,     setFlyingCap]     = useState<number|null>(null);
  const [toast,         setToast]         = useState<{msg:string;color:string}|null>(null);
  const [rightTab,      setRightTab]      = useState<"schedule"|"capsule"|"priority"|"profile">("schedule");
  const [searchKw,      setSearchKw]      = useState("");
  const [reminderEv,    setReminderEv]    = useState<ScheduleEvent|null>(null);
  const [selStyle,      setSelStyle]      = useState(1); // default毒舌室友 (AI pre-selected)
  const [sentReminder,  setSentReminder]  = useState(false);
  const [aiVisible,     setAiVisible]     = useState(false);
  const [aiChatId,      setAiChatId]      = useState<number|null>(null);
  const [aiMessages,    setAiMessages]    = useState<AiMsg[]>([]);
  const [aiInput,       setAiInput]       = useState("");
  const [aiLoading,     setAiLoading]     = useState(false);
  const [ctxMenu,       setCtxMenu]       = useState<CtxMenu>(null);
  const [schDate,       setSchDate]       = useState(TODAY);
  const [weekStart,     setWeekStart]     = useState(TODAY);
  const [showEvModal,   setShowEvModal]   = useState(false);
  const [editingEv,     setEditingEv]     = useState<ScheduleEvent|null>(null);
  const [evForm,        setEvForm]        = useState<EventForm>(EF);
  const [capFilter,     setCapFilter]     = useState<CapsuleFilter>("all");
  const [showLegend,    setShowLegend]    = useState(false);
  const [showPriorityLegend,setShowPriorityLegend]=useState(false);
  const [selectMode,    setSelectMode]    = useState(false);
  const [selMsgIds,     setSelMsgIds]     = useState<Set<number>>(new Set());
  const [sharedMode,    setSharedMode]    = useState<SharedMode>(null);
  const [highlightId,   setHighlightId]   = useState<number|null>(null);
  const [groupSchedM,   setGroupSchedM]   = useState<{chatId:number}|null>(null);
  const [sensitiveCapId,setSensitiveCapId]= useState<number|null>(null);
  const [sensitiveInput,setSensitiveInput]= useState("");
  const [unlockedCaps,  setUnlockedCaps]  = useState<Set<number>>(new Set());
  const [reminderConfig,setReminderConfig]= useState<{styleIdx:number;sendTime:string;evId:number;evTitle:string}|null>(null);
  const [reminderTimeOpt,setReminderTimeOpt]=useState<"1h"|"3h"|"custom">("3h");
  const [reminderCustomT,setReminderCustomT]=useState("21:00");
  const [timeJumped,    setTimeJumped]    = useState(false);
  const [alertBanner,   setAlertBanner]   = useState(false);
  const [priorityDone,  setPriorityDone]  = useState<Set<string>>(new Set());
  const [demoBarPos,    setDemoBarPos]    = useState<{x:number;y:number}>({x:380,y:16});
  const [demoBarDrag,   setDemoBarDrag]   = useState<{startX:number;startY:number;origX:number;origY:number}|null>(null);
  const [showImportModal,setShowImportModal]=useState(false);
  const [importStep,    setImportStep]    = useState<"choose"|"loading"|"done">("choose");
  const [importMethod,  setImportMethod]  = useState<string>("");
  const [flightModal,   setFlightModal]   = useState<string|null>(null);
  const [travelMonitor, setTravelMonitor] = useState(false);
  const [aiCtxMenu,    setAiCtxMenu]    = useState<{x:number;y:number;content:string}|null>(null);
  const [priorityOverrides, setPriorityOverrides] = useState<Record<string,string>>({});
  const [editingPItem,  setEditingPItem]  = useState<{id:string;title:string;level:string;desc:string}|null>(null);
  const [aiLearnLog,    setAiLearnLog]    = useState<{from:string;to:string;title:string;time:string}[]>([]);
  // ── 新增状态 ──────────────────────────────────────────────
  const [showCrossAnalysis, setShowCrossAnalysis] = useState(false);
  // 提醒风格使用历史（模拟AI学到的偏好）
  const [reminderStyleCounts, setReminderStyleCounts] = useState<Record<number,number>>({...PROFILE_DATA.remindStyleHistory});
  // 手动抓取次数（AI学习记录）
  const [captureLog,    setCaptureLog]    = useState<{title:string;time:string}[]>([]);

  const chatEndRef=useRef<HTMLDivElement>(null);
  const aiEndRef  =useRef<HTMLDivElement>(null);
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages,activeChat]);
  useEffect(()=>{aiEndRef.current?.scrollIntoView({behavior:"smooth"});},[aiMessages,aiLoading]);
  useEffect(()=>{const fn=()=>{setCtxMenu(null);setAiCtxMenu(null);};window.addEventListener("click",fn);return()=>window.removeEventListener("click",fn);},[]);
  useEffect(()=>{setSelectMode(false);setSelMsgIds(new Set());},[activeChat]);

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

  const showToast=(msg:string,color="#52C41A")=>{setToast({msg,color});setTimeout(()=>setToast(null),2800);};

  // 计算AI推荐的提醒风格（响应次数最多的）
  const aiRecommendedStyleIdx = (() => {
    const entries = Object.entries(reminderStyleCounts) as [string,number][];
    return parseInt(entries.sort((a,b)=>b[1]-a[1])[0][0]);
  })();
  const totalStyleUses = Object.values(reminderStyleCounts).reduce((s,v)=>s+v,0);

  const handleSelectChat=(id:number)=>{
    setActiveChat(id);setUnreadMap(prev=>({...prev,[id]:0}));
    if(aiChatId!==id)setAiVisible(false);
  };

  const openAI=useCallback((chatId:number,prefill?:string)=>{
    setAiChatId(chatId);setAiVisible(true);setAiInput("");setSharedMode(null);
    if(aiChatId!==chatId){
      setAiMessages([]);setAiLoading(true);
      setTimeout(()=>{
        const sum=AI_SUM[chatId]||`📋 **对话总结**\n\n基于「${CHATS.find(c=>c.id===chatId)?.name}」的内容分析。`;
        setAiMessages([{role:"ai",content:sum}]);setAiLoading(false);
        if(chatId===13&&!travelMonitor){
          setTimeout(()=>{
            setAiMessages(p=>[...p,{role:"ai",content:"✨ **出行监控已开启**\n\n我会持续跟踪以下信息：\n✈️ 航班状态（MU5435 / MU5436）\n🏨 酒店预订动态\n🌤️ 重庆天气变化\n\n一旦有变更，我会立即生成代办通知你。点击聊天中的航班卡片可查看实时状态。"}]);
            setTravelMonitor(true);
          },1500);
        }
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
  },[aiChatId,travelMonitor]);

  const sendAI=(text?:string)=>{
    const q=text||aiInput.trim();if(!q)return;
    setAiMessages(p=>[...p,{role:"user",content:q}]);setAiInput("");setAiLoading(true);
    setTimeout(()=>{setAiMessages(p=>[...p,{role:"ai",content:aiFollowup(q,aiChatId||activeChat)}]);setAiLoading(false);},900);
  };

  const handleShareAI=()=>{
    const chat=CHATS.find(c=>c.id===aiChatId);
    if(!chat||chat.type!=="private")return;
    setSharedMode({chatId:aiChatId!,partnerName:chat.name,partnerColor:chat.color});
    showToast(`🤝 已共享给 ${chat.name}`,"#7B68EE");
    setTimeout(()=>{
      setAiMessages(p=>[...p,{role:"ai",content:`🤝 **协作模式已开启**\n\n**${chat.name}** 已加入对话。`}]);
      const pm=partnerFirstMsg(aiChatId!);
      if(pm){
        setTimeout(()=>{
          setAiMessages(p=>[...p,{role:"partner",content:pm,sender:chat.name}]);
          setAiLoading(true);
          setTimeout(()=>{setAiMessages(p=>[...p,{role:"ai",content:aiFollowup(pm,aiChatId!)}]);setAiLoading(false);},1000);
        },1500);
      }
    },800);
  };

  const toggleSelectMode=()=>{setSelectMode(p=>!p);setSelMsgIds(new Set());};
  const toggleMsgSel=(id:number)=>setSelMsgIds(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});

  const MULTI_CTX:Record<number,string>={
    13:"这是我和小美讨论重庆出行的对话。请帮我总结：1.出行时间和方式 2.航班和酒店信息 3.行程建议",
    20:"这是我和策划部的活动方案讨论。请帮我总结",
    21:"这是我和室友的矛盾对话。请客观分析",
    3:"这是我和师兄的私聊。请帮我总结",
  };
  const handleMultiAI=()=>{
    const msgs=(messages[activeChat]||[]).filter(m=>selMsgIds.has(m.id)&&!m.isSystem);
    if(!msgs.length)return;
    const content=msgs.map(m=>`[${m.self?"我":m.sender}]: ${m.content}`).join("\n");
    const ctx=MULTI_CTX[activeChat]||"请帮我提炼核心信息";
    const q=`【选中了 ${msgs.length} 条消息】\n\n${ctx}\n\n---\n${content.slice(0,700)}`;
    setSelectMode(false);setSelMsgIds(new Set());
    openAI(activeChat,q);setRightTab("schedule");
  };

  const handleCM=(e:React.MouseEvent,msg:Message,cid:number)=>{e.preventDefault();e.stopPropagation();setCtxMenu({x:e.clientX,y:e.clientY,msg,cid});};
  const handleAIMsg=(msg:Message,cid:number)=>{setCtxMenu(null);openAI(cid,`请帮我分析这条消息：\n\n"${msg.content.slice(0,200)}"`);setActiveChat(cid);setUnreadMap(p=>({...p,[cid]:0}));};
  const handleDDL=(msg:Message,cid:number)=>{
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
      content:isSensitive?`账号：****　密码：****\n（${chat?.name||"私聊"} · 研讨室预约账号）\n🔒 点击输入密码查看完整内容`:msg.content.slice(0,120),
      rawContent:isSensitive?msg.content:undefined,
      time:msg.time,from:msg.sender,new:true,createdAt:TODAY,
      scheduleData:sched||undefined,
    };
    setCapsules(p=>[cap,...p]);setNewCapIds(p=>[cap.id,...p]);setFlyingCap(cap.id);setRightTab("capsule");
    setTimeout(()=>setFlyingCap(null),800);
    // AI学习：记录手动抓取
    const now=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    setCaptureLog(p=>[{title:cap.title.slice(0,20),time:now},...p].slice(0,10));
    showToast(isSensitive?"⚫ 敏感信息已加密抓取，需密码 666 解锁":sched?"🟡 内容已抓取为代办，Q仔已记录你的抓取习惯":"🔵 已提取为参考代办",isSensitive?"#8C8C8C":sched?"#FA8C16":"#3B82F6");
  };
  const handleEnterSel=(msg:Message,cid:number)=>{
    setCtxMenu(null);
    if(activeChat!==cid){setActiveChat(cid);setUnreadMap(p=>({...p,[cid]:0}));}
    setSelectMode(true);setSelMsgIds(new Set([msg.id]));showToast("☑️ 多选模式已开启","#4A90D9");
  };

  const openAddEv=()=>{setEditingEv(null);setEvForm({...EF,date:schDate});setShowEvModal(true);};
  const openEditEv=(ev:ScheduleEvent)=>{
    setEditingEv(ev);
    setEvForm({title:ev.title,date:ev.date,startTime:ev.startTime,endTime:ev.endTime,location:ev.location||"",type:ev.type,priority:ev.priority||"medium"});
    setShowEvModal(true);
  };
  const saveEv=()=>{
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
  const deleteEv=(id:number)=>{setSchedule(p=>p.filter(e=>e.id!==id));showToast("🗑️ 日程已删除","#8C8C8C");};

  const handleImport=(method:string)=>{
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

  const confirmCap=(id:number)=>{
    const cap=capsules.find(c=>c.id===id);
    setCapsules(p=>p.map(c=>c.id===id?{...c,type:"confirmed",new:false}:c));
    setNewCapIds(p=>p.filter(i=>i!==id));
    if(cap?.scheduleData){
      const nid=Date.now();
      const ev:ScheduleEvent={id:nid,date:cap.scheduleData.date||TODAY,startTime:cap.scheduleData.startTime||"09:00",endTime:cap.scheduleData.endTime||"10:00",title:cap.scheduleData.title||cap.title,location:cap.scheduleData.location,type:cap.scheduleData.type||"task",color:cap.scheduleData.color||"#FFE7BA",priority:cap.scheduleData.priority||"medium",fromCapsule:true,groupName:cap.group,flightNo:cap.scheduleData.flightNo};
      setSchedule(p=>{
        if(cap.flightNo){const filtered=p.filter(e=>e.flightNo!==cap.flightNo);return [...filtered,ev];}
        const ex=p.some(e=>e.title===ev.title&&e.date===ev.date);
        return ex?p:[...p,ev];
      });
      setSchDate(ev.date);setRightTab("schedule");
      setTimeout(()=>setHighlightId(nid),200);setTimeout(()=>setHighlightId(null),3000);
      showToast("✅ 已确认，已跳转至日程表","#52C41A");
    } else {showToast("✅ 代办已确认","#52C41A");}
  };
  const dismissCap=(id:number)=>{setCapsules(p=>p.filter(c=>c.id!==id));setNewCapIds(p=>p.filter(i=>i!==id));showToast("已忽略该代办","#8C8C8C");};

  // ── 演示按钮 ─────────────────────────────────────────────
  const simDDL=()=>{
    setActiveChat(4);setUnreadMap(p=>({...p,4:0}));
    setTimeout(()=>setMessages(p=>({...p,4:[...p[4],{id:Date.now(),sender:"张老师",content:"再次补充：作业5月6日23:59截止，双平台提交，不接受补交！",time:"22:05",self:false}]})),400);
    setTimeout(()=>{
      const cap:Capsule={id:Date.now(),type:"pending",importance:"high",group:"计算机网络 · 课程群",title:"📎 作业补充要求",content:"学习通也要交！5/6 23:59 截止，不接受补交",time:"22:05",from:"张老师",new:true,createdAt:TODAY,scheduleData:{date:"2026-05-06",startTime:"23:00",endTime:"23:59",title:"📎 计网作业截止",type:"task",color:"#FFE7BA",priority:"high"}};
      setCapsules(p=>[cap,...p]);setNewCapIds(p=>[cap.id,...p]);setFlyingCap(cap.id);setRightTab("capsule");
      setTimeout(()=>setFlyingCap(null),800);showToast("🟡 新代办已捕获（Q仔识别：张老师本学期第3次DDL提醒，紧迫度↑）","#FA8C16");
    },1100);
  };
  const simConflict=()=>{
    setActiveChat(7);setUnreadMap(p=>({...p,7:0}));
    setTimeout(()=>{
      const cap:Capsule={id:Date.now(),type:"conflict",importance:"high",group:"班级群 × 创新赛",title:"🚨 5/18 时间冲突",content:"5/18 紫金山团建（全天）\n5/18 创新创业讲座（10:00-12:00）\n两者重叠，需取舍",time:"20:20",from:"AI 冲突检测",new:true,createdAt:TODAY};
      setCapsules(p=>[cap,...p]);setNewCapIds(p=>[cap.id,...p]);setFlyingCap(cap.id);setRightTab("capsule");
      setTimeout(()=>setFlyingCap(null),800);showToast("🔴 冲突检测！已生成紧急代办","#FF4D4F");
    },600);
  };
  const simSensitive=()=>{
    setActiveChat(3);setUnreadMap(p=>({...p,3:0}));
    setTimeout(()=>{
      const msg=(messages[3]||[]).find(m=>m.id===18);
      if(msg){
        const chat=CHATS.find(c=>c.id===3);
        const cap:Capsule={
          id:Date.now(),type:"sensitive",importance:"high",
          group:chat?.name||"张师兄",
          title:`🔐 ${chat?.name||"张师兄"} · 账号密码`,
          content:`账号：****　密码：****\n（教务系统 · 研讨室预约）\n🔒 点击输入密码 666 解锁`,
          rawContent:msg.content,
          time:msg.time,from:msg.sender,new:true,createdAt:TODAY,
        };
        setCapsules(p=>[cap,...p]);setNewCapIds(p=>[cap.id,...p]);setFlyingCap(cap.id);setRightTab("capsule");
        setTimeout(()=>setFlyingCap(null),800);
        const now=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
        setCaptureLog(p=>[{title:"账号密码·张师兄",time:now},...p].slice(0,10));
        showToast("⚫ 敏感信息已加密抓取，点击代办输入密码 666 解锁","#8C8C8C");
      }
    },600);
  };

  const captureAIContent=(content:string)=>{
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

  const simReminder=()=>{
    setRightTab("schedule");
    setSchDate("2026-05-06");
    setWeekStart("2026-05-03");
    const ev=schedule.find(e=>e.date==="2026-05-06"&&e.title.includes("创新赛"))
            ||schedule.find(e=>e.date==="2026-05-06");
    if(ev)setTimeout(()=>{
      setReminderEv(ev);
      setSentReminder(false);
      setReminderTimeOpt("3h");
      setReminderCustomT("21:00");
      // AI预选风格
      setSelStyle(aiRecommendedStyleIdx);
    },350);
  };

  const simGroupSched=(chatId:number)=>{
    setActiveChat(chatId);setUnreadMap(p=>({...p,[chatId]:0}));
    setTimeout(()=>{
      setMessages(p=>({...p,[chatId]:[...p[chatId],{id:Date.now(),sender:"Q仔",isAI:true,content:`📊 收到！正在分析 ${GROUP_SCHED[chatId].total} 位成员的时间回复…`,time:"10:46",self:false}]}));
      setTimeout(()=>{
        setMessages(p=>({...p,[chatId]:[...p[chatId],{id:Date.now()+1,sender:"Q仔",isAI:true,content:`✅ 分析完成！\n\n最佳时间：**${GROUP_SCHED[chatId].best.label}**\n参与率：${GROUP_SCHED[chatId].best.pct}%\n\n👇 点击查看完整可视化分析`,time:"10:47",self:false}]}));
        setGroupSchedM({chatId});
      },1200);
    },600);
  };

  const simTravel=()=>{
    setActiveChat(13);setUnreadMap(p=>({...p,13:0}));
    setTimeout(()=>showToast("💡 选中航班相关消息，点击「AI总结」可开启出行监控","#13C2C2"),500);
  };

  const handleFlightDelay=()=>{
    setFlightModal("MU5435");
    setTimeout(()=>{
      const exists=capsules.some(c=>c.flightNo==="MU5435");
      if(!exists){
        const cap:Capsule={
          id:Date.now(),type:"travel",importance:"high",
          group:"小美 💕 · 出行监控",
          title:"✈️ MU5435 航班延误",
          content:`原定 5/10 09:30 起飞\n实时：延误40分钟\n预计 10:10 起飞\n登机口：B12\n\n建议提前出发应对变更`,
          time:"15:35",from:"Q仔 出行监控",new:true,createdAt:TODAY,
          flightNo:"MU5435",
          scheduleData:{date:"2026-05-10",startTime:"10:10",endTime:"12:35",title:"✈️ MU5435 (延误40分)",type:"travel",color:"#FFF1F0",priority:"high",flightNo:"MU5435"},
        };
        setCapsules(p=>[cap,...p]);
        setNewCapIds(p=>[cap.id,...p]);
        setFlyingCap(cap.id);
        setTimeout(()=>setFlyingCap(null),800);
        showToast("🛬 航班变更，已生成代办","#13C2C2");
      }
    },1500);
  };

  // 计算
  const weekDays=Array.from({length:7},(_,i)=>addDays(weekStart,i));
  const eventDates=new Set(schedule.map(e=>e.date));
  const dayEvs=schedule.filter(e=>e.date===schDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  const currentChat=CHATS.find(c=>c.id===activeChat);
  const isPrivate=currentChat?.type==="private";
  const filteredChats=CHATS.filter(c=>!searchKw||c.name.toLowerCase().includes(searchKw.toLowerCase()));
  const pendingCount=capsules.filter(c=>c.type==="pending"||c.type==="conflict").length;
  const totalUnread=(Object.values(unreadMap) as number[]).reduce((s:number,v:number)=>s+v,0);
  const filteredCaps=filterCaps(capsules,capFilter);
  const remStyles=reminderEv?getReminderStyles(reminderEv):[];

  // 所有学习记录（合并）
  const allLearnLog = [
    ...PROFILE_DATA.initialLearned.map(l=>({title:l,from:"",to:"",time:"历史"})),
    ...aiLearnLog.map(l=>({title:`「${l.title.slice(0,12)}」优先级 ${l.from}→${l.to}`,from:l.from,to:l.to,time:l.time})),
    ...captureLog.map(l=>({title:`手动抓取「${l.title}」`,from:"",to:"",time:l.time})),
  ].slice(0,12);

  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",background:"#F0F2F5",fontFamily:"'PingFang SC','Microsoft YaHei',sans-serif",overflow:"hidden",position:"relative",color:"#333"}}>

      {/* 强提醒 Banner */}
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

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 22px",borderRadius:24,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.18)"}}>{toast.msg}</div>}

      {/* 右键菜单 */}
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
          <div onClick={()=>{navigator.clipboard?.writeText(ctxMenu.msg.content).catch(()=>{});setCtxMenu(null);}} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,color:"#666",display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>📋 复制文本</div>
        </div>
      )}
      {aiCtxMenu&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"fixed",left:aiCtxMenu.x,top:aiCtxMenu.y,background:"#fff",border:"1px solid #E5E8EE",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.14)",zIndex:9998,minWidth:160,overflow:"hidden"}}>
          <div onClick={()=>captureAIContent(aiCtxMenu.content)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>🔵 抓取为方案参考</div>
          <div style={{height:1,background:"#F0F0F0"}}/>
          <div onClick={()=>{navigator.clipboard?.writeText(aiCtxMenu.content).catch(()=>{});setAiCtxMenu(null);}} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,color:"#666"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>📋 复制文本</div>
        </div>
      )}

      {/* 左侧导航条 */}
      <div style={{width:56,background:"linear-gradient(180deg,#2D3138 0%,#1F2329 100%)",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:16,gap:4}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",marginBottom:12,border:"2px solid #fff"}}>小A</div>
        {([{icon:"💬",badge:totalUnread as number,active:true},{icon:"👥"},{icon:"📁"},{icon:"🎮"},{icon:"📅"}] as {icon:string;badge?:number;active?:boolean}[]).map((item,i)=>(
          <div key={i} style={{position:"relative",width:40,height:40,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",background:item.active?"rgba(74,144,217,0.2)":"transparent",color:item.active?"#4A90D9":"#9DA1A6"}}>
            {item.icon}
            {item.badge&&item.badge>0?<div style={{position:"absolute",top:-2,right:-2,background:"#FF4D4F",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,minWidth:16,textAlign:"center"}}>{item.badge>99?"99+":item.badge}</div>:null}
          </div>
        ))}
        <div style={{flex:1}}/>
        {/* Q仔学习状态指示 */}
        <div style={{marginBottom:6,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          {aiLearnLog.length>0&&(
            <div style={{width:8,height:8,borderRadius:"50%",background:"#52C41A",boxShadow:"0 0 6px #52C41A"}} title="Q仔正在学习中"/>
          )}
        </div>
        <div style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",marginBottom:12}}>Q</div>
      </div>

      {/* 聊天列表 */}
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
            return (
              <div key={chat.id} onClick={()=>handleSelectChat(chat.id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",background:activeChat===chat.id?"#E8F0FE":chat.pinned?"#FAFBFD":"transparent",borderBottom:"1px solid #F5F5F5"}}>
                <div style={{position:"relative",flexShrink:0}}>
                  <div style={{width:42,height:42,borderRadius:8,background:chat.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:chat.avatar.length>1?18:16,fontWeight:700,color:"#fff"}}>{chat.avatar}</div>
                  {chat.online&&<div style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,borderRadius:"50%",background:"#52C41A",border:"2px solid #fff"}}/>}
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
            <div style={{fontSize:10,color:"#999"}}>群聊监听中 · 已归档 {capsules.length} 个代办</div>
          </div>
          {pendingCount>0&&<div style={{background:"#FA8C16",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{pendingCount}</div>}
        </div>
      </div>

      {/* 中间聊天区 */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#F0F2F5",minWidth:0}}>
        <div style={{padding:"12px 20px",background:"#fff",borderBottom:"1px solid #E5E5E5",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
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
              <div style={{fontSize:11,color:"#4A90D9",background:"#E8F0FE",padding:"4px 10px",borderRadius:12,border:"1px solid #BAE0FF",display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"#52C41A",display:"inline-block"}}/>Q仔监听中
              </div>
            )}
          </div>
        </div>

        {selectMode&&(
          <div style={{background:"#E8F0FE",padding:"6px 20px",borderBottom:"1px solid #BAE0FF",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:"#4A90D9",fontWeight:600}}>☑️ 多选模式 · 已选 {selMsgIds.size} 条</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={handleMultiAI} disabled={selMsgIds.size===0} style={{padding:"4px 12px",borderRadius:8,border:"none",background:selMsgIds.size>0?"linear-gradient(135deg,#4A90D9,#7B68EE)":"#ccc",color:"#fff",fontSize:11,fontWeight:600,cursor:selMsgIds.size>0?"pointer":"default"}}>
                ✨ AI总结选中 ({selMsgIds.size}条)
              </button>
              <button onClick={()=>{setSelectMode(false);setSelMsgIds(new Set());}} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #BAE0FF",background:"transparent",color:"#666",fontSize:11,cursor:"pointer"}}>✗ 取消</button>
            </div>
          </div>
        )}

        <div style={{flex:1,overflowY:"auto",padding:"14px 20px",display:"flex",flexDirection:"column",gap:4}}>
          {(messages[activeChat]||[]).map((msg,idx)=>{
            const prev=(messages[activeChat]||[])[idx-1];
            const showDate=msg.date&&(!prev||prev.date!==msg.date);
            const isSelected=selMsgIds.has(msg.id);
            const isFlightMsg=activeChat===13&&msg.id===15;
            if(msg.isSystem)return(
              <div key={msg.id}>
                {showDate&&<div style={{textAlign:"center",margin:"16px 0 12px",fontSize:11,color:"#999"}}><span style={{background:"#E5E8EE",padding:"3px 12px",borderRadius:10}}>{msg.date}</span></div>}
                <div style={{textAlign:"center",margin:"6px 0",fontSize:11,color:"#999"}}>{msg.content}</div>
              </div>
            );
            return(
              <div key={msg.id}>
                {showDate&&<div style={{textAlign:"center",margin:"16px 0 12px",fontSize:11,color:"#999"}}><span style={{background:"#E5E8EE",padding:"3px 12px",borderRadius:10}}>{msg.date}</span></div>}
                <div style={{display:"flex",flexDirection:"row",alignItems:"flex-start",gap:8,marginBottom:10,background:isSelected?"rgba(74,144,217,0.08)":"transparent",borderRadius:8,padding:isSelected?"4px 6px":"0",cursor:selectMode?"pointer":"default",justifyContent:msg.self?"flex-end":"flex-start"}}
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
                      {isFlightMsg?(
                        <div onClick={e=>{e.stopPropagation();handleFlightDelay();}} style={{padding:"12px 14px",borderRadius:"4px 12px 12px 12px",background:"linear-gradient(135deg,#fff,#F0F9FF)",border:"1.5px solid #91D5FF",cursor:"pointer",boxShadow:"0 2px 8px rgba(24,144,255,0.15)",minWidth:280}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                            <span style={{fontSize:16}}>✈️</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#1890FF"}}>航班信息卡片</span>
                            <span style={{marginLeft:"auto",fontSize:10,color:"#fff",background:"#FF4D4F",padding:"1px 6px",borderRadius:6,fontWeight:600}}>点击查看实时</span>
                          </div>
                          <div style={{fontSize:12.5,color:"#333",lineHeight:1.7,whiteSpace:"pre-line"}}>{msg.content}</div>
                          <div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #91D5FF",fontSize:10.5,color:"#1890FF"}}>👆 点击卡片查看实时航班状态</div>
                        </div>
                      ):(
                        <div onContextMenu={e=>handleCM(e,msg,activeChat)}
                          style={{padding:"8px 12px",borderRadius:msg.self?"10px 4px 10px 10px":"4px 10px 10px 10px",background:msg.self?"#A6D8FF":msg.isAI?"linear-gradient(135deg,#F0F7FF,#F5F0FF)":"#fff",color:"#333",fontSize:13.5,lineHeight:1.55,border:msg.atMe?"1.5px solid #FA8C16":msg.isAI?"1px solid #BAE0FF":"1px solid #EAEAEA",whiteSpace:"pre-line",wordBreak:"break-word",boxShadow:"0 1px 2px rgba(0,0,0,0.04)",cursor:"context-menu",userSelect:"text"}}>
                          {msg.content}
                        </div>
                      )}
                      {msg.self&&<div style={{fontSize:10,color:"#bbb",marginTop:3}}>{msg.time}</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef}/>
        </div>

        <div style={{background:"#fff",borderTop:"1px solid #E5E5E5"}}>
          <div style={{padding:"8px 16px 4px",display:"flex",alignItems:"center",gap:14,fontSize:16}}>
            {["😀","✂️","📁","🖼️","📨","🎤"].map((i,k)=><span key={k} style={{cursor:"pointer",color:"#666"}}>{i}</span>)}
          </div>
          <div style={{padding:"0 16px 12px"}}>
            <div style={{minHeight:56,padding:"8px 12px",background:"#F8F9FB",borderRadius:6,border:"1px solid #EAEAEA",fontSize:12.5,color:"#bbb"}}>输入消息…</div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
              <button style={{padding:"5px 18px",borderRadius:4,border:"none",background:"linear-gradient(135deg,#4A90D9,#2563EB)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>发送 ▾</button>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧面板 */}
      <div style={{width:360,background:"#fff",borderLeft:"1px solid #E5E5E5",display:"flex",flexDirection:"column",overflow:"hidden"}}>
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
                    {aiChatId===13&&travelMonitor&&<span style={{fontSize:10,background:"#13C2C2",color:"#fff",padding:"1px 6px",borderRadius:8,fontWeight:600}}>🛬 监控中</span>}
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
              <div style={{fontSize:10.5,color:"#999",marginBottom:7}}>{aiMessages.length<=1?"快速提问":"继续追问"}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {(
                  aiChatId===13?["航班实时状态✈️","重庆游玩推荐🌶️","出行准备清单"]:
                  aiChatId===20?["互动游戏怎么设计🎮","经费分配合理吗💰"]:
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

        {!aiVisible&&(
          <>
            {/* ── 4个Tab ── */}
            <div style={{display:"flex",borderBottom:"1px solid #E5E5E5",background:"#FAFBFD",flexShrink:0,overflowX:"auto"}}>
              {([
                {key:"schedule", label:"📅 日程",  count:0},
                {key:"capsule",  label:"📋 代办",  count:pendingCount},
                {key:"priority", label:"🎯 优先级",count:0},
                {key:"profile",  label:"👤 了解你",count:aiLearnLog.length},
              ] as {key:string;label:string;count:number}[]).map(tab=>(
                <button key={tab.key} onClick={()=>setRightTab(tab.key as "schedule"|"capsule"|"priority"|"profile")}
                  style={{flex:1,padding:"10px 4px",border:"none",background:rightTab===tab.key?"#fff":"transparent",color:rightTab===tab.key?"#4A90D9":"#666",fontSize:11.5,fontWeight:rightTab===tab.key?700:500,cursor:"pointer",borderBottom:rightTab===tab.key?"2px solid #4A90D9":"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:4,whiteSpace:"nowrap"}}>
                  {tab.label}
                  {tab.count>0&&<span style={{background:rightTab===tab.key?"#4A90D9":tab.key==="profile"?"#52C41A":"#FA8C16",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8}}>{tab.count}</span>}
                </button>
              ))}
            </div>

            {/* ── 日程面板 ── */}
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
                            <span style={{fontSize:10,background:pc+"22",color:pc,padding:"1px 5px",borderRadius:6,fontWeight:600,flexShrink:0}}>{ev.priority==="high"?"紧急":ev.priority==="medium"?"重要":"一般"}</span>
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

            {/* ── 代办面板 ── */}
            {rightTab==="capsule"&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
                <div style={{padding:"8px 12px",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    {(["all","week","event","conflict","confirmed","info"] as CapsuleFilter[]).map(f=>{
                      const labels:Record<string,string>={all:"全部",week:"近一周",event:"📌 事件",conflict:"⚠️ 冲突",confirmed:"✅ 已确认",info:"🔵 信息"};
                      return <button key={f} onClick={()=>setCapFilter(f)} style={{padding:"3px 8px",borderRadius:8,border:"1px solid "+(capFilter===f?"#4A90D9":"#E5E8EE"),background:capFilter===f?"#E8F0FE":"transparent",color:capFilter===f?"#4A90D9":"#666",fontSize:11,fontWeight:capFilter===f?700:400,cursor:"pointer"}}>{labels[f]}</button>;
                    })}
                    <button onClick={()=>setShowLegend(!showLegend)} style={{marginLeft:"auto",padding:"3px 8px",borderRadius:8,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:11,cursor:"pointer"}}>❓</button>
                  </div>
                  {showLegend&&(
                    <div style={{background:"#FAFBFD",border:"1px solid #E5E8EE",borderRadius:8,padding:"8px 10px",marginTop:4}}>
                      {[{e:"🔴",l:"紧急",d:"时间冲突或3天内截止"},{e:"🟠",l:"重要",d:"一周内截止"},{e:"🟡",l:"一般",d:"普通待办"},{e:"🟢",l:"已确认",d:"已写入日程"},{e:"🔵",l:"方案参考",d:"规划信息"},{e:"⚫",l:"敏感",d:"隐私保护"}].map(({e,l,d})=>(
                        <div key={l} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,fontSize:11}}><span>{e}</span><span style={{fontWeight:600,color:"#333",width:50}}>{l}</span><span style={{color:"#999"}}>{d}</span></div>
                      ))}
                    </div>
                  )}
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
                        {/* ── 老师画像标签（AI洞察） ── */}
                        {teacherProfile&&(
                          <div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:8,background:`${teacherProfile.color}12`,border:`1px solid ${teacherProfile.color}33`,marginBottom:7}}>
                            <span style={{fontSize:10}}>{teacherProfile.icon}</span>
                            <span style={{fontSize:10,color:teacherProfile.color,fontWeight:600}}>{cap.from}：{teacherProfile.label}</span>
                          </div>
                        )}
                        {/* ── AI捕获分析说明 ── */}
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
                            <button onClick={()=>confirmCap(cap.id)} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",background:st.badge,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                              ✓ {cap.scheduleData?"确认入日程":"确认"}
                            </button>
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

            {/* ── 优先级面板（增强版）── */}
            {rightTab==="priority"&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
                <div style={{padding:"10px 12px",background:"linear-gradient(135deg,#FFF7E6,#FFF0F5)",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#333",marginBottom:2}}>🎯 智能优先级排序</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:2}}>
                        <div style={{fontSize:11,color:"#999"}}>AI综合判断</div>
                        {aiLearnLog.length>0&&(
                          <span style={{fontSize:10,color:"#7B68EE",background:"#F3E5F5",padding:"1px 6px",borderRadius:8,fontWeight:600,display:"flex",alignItems:"center",gap:3}}>
                            <span style={{width:5,height:5,borderRadius:"50%",background:"#52C41A",display:"inline-block"}}/>
                            Q仔已学习 {aiLearnLog.length} 次偏好
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={()=>setShowPriorityLegend(!showPriorityLegend)} style={{padding:"3px 8px",borderRadius:8,border:"1px solid #E5E8EE",background:"#fff",color:"#666",fontSize:11,cursor:"pointer"}}>❓ 图例</button>
                  </div>
                  {/* AI学到的偏好摘要 */}
                  {aiLearnLog.length>=2&&(
                    <div style={{marginTop:8,background:"linear-gradient(135deg,#F3E5F5,#E8F0FE)",border:"1px solid #D3B8E0",borderRadius:8,padding:"6px 10px",fontSize:10.5,color:"#7B68EE",lineHeight:1.5}}>
                      💡 Q仔学习到：你倾向于将「{aiLearnLog[aiLearnLog.length-1].title.slice(0,10)}」类事项调为
                      <strong> {aiLearnLog[aiLearnLog.length-1].to}</strong>，下次同类任务将自动参考此偏好。
                    </div>
                  )}
                  {showPriorityLegend&&(
                    <div style={{background:"#fff",border:"1px solid #E5E8EE",borderRadius:8,padding:"10px 12px",marginTop:8}}>
                      {[{e:"🔴",l:"紧急",d:"时间冲突或3天内截止"},{e:"🟠",l:"重要",d:"一周内截止"},{e:"🟡",l:"一般",d:"普通待办"},{e:"🟢",l:"已确认",d:"已写入日程"},{e:"🔵",l:"方案参考",d:"规划信息"},{e:"⚫",l:"敏感",d:"隐私保护"}].map(({e,l,d})=>(
                        <div key={l} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,fontSize:11.5}}>
                          <span style={{fontSize:13}}>{e}</span>
                          <span style={{fontWeight:700,color:"#333",width:60}}>{l}</span>
                          <span style={{color:"#999"}}>{d}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:6,minHeight:0}}>
                  {(()=>{
                    type PItem={id:string;emoji:string;level:string;color:string;title:string;desc:string};
                    const items:PItem[]=[];
                    const t3="2026-05-02";const t7="2026-05-07";
                    const skipTitles=["国家安全","近现代史","数据结构实验课","操作系统","数据库原理","软件工程","编译原理","人工智能导论"];
                    capsules.forEach(c=>{
                      const dd=c.scheduleData?.date||"";
                      if(c.type==="conflict")      items.push({id:`c${c.id}`,emoji:"🔴",level:"紧急",  color:"#FF4D4F",title:c.title,desc:c.content.slice(0,55)});
                      else if(c.type==="sensitive") items.push({id:`c${c.id}`,emoji:"⚫",level:"敏感",  color:"#8C8C8C",title:c.title,desc:"隐私信息已加密保护"});
                      else if(c.type==="travel")   items.push({id:`c${c.id}`,emoji:"🔴",level:"紧急",  color:"#FF4D4F",title:c.title,desc:c.content.slice(0,55)});
                      else if(c.type==="plan")     items.push({id:`c${c.id}`,emoji:"🔵",level:"方案参考",color:"#3B82F6",title:c.title,desc:c.content.slice(0,55)});
                      else if(c.type==="confirmed")items.push({id:`c${c.id}`,emoji:"🟢",level:"已确认",color:"#52C41A",title:c.title,desc:"已写入日程"});
                      else if(c.importance==="high")items.push({id:`c${c.id}`,emoji:"🔴",level:"紧急",  color:"#FF4D4F",title:c.title,desc:c.content.slice(0,55)});
                      else if(dd&&dd<=t3)          items.push({id:`c${c.id}`,emoji:"🔴",level:"紧急",  color:"#FF4D4F",title:c.title,desc:c.content.slice(0,55)});
                      else if(dd&&dd<=t7)          items.push({id:`c${c.id}`,emoji:"🟠",level:"重要",  color:"#FA8C16",title:c.title,desc:c.content.slice(0,55)});
                      else                         items.push({id:`c${c.id}`,emoji:"🟡",level:"一般",  color:"#FAAD14",title:c.title,desc:c.content.slice(0,55)});
                    });
                    schedule.filter(ev=>!skipTitles.some(s=>ev.title.includes(s))).forEach(ev=>{
                      const isLow=["团建","讲座","出游","志愿"].some(k=>ev.title.includes(k));
                      const desc=`${ev.date.slice(5).replace("-","/")} ${ev.startTime}${ev.location?` · ${ev.location}`:""}`;
                      if(ev.priority==="high")items.push({id:`s${ev.id}`,emoji:"🔴",level:"紧急",color:"#FF4D4F",title:ev.title,desc});
                      else if(ev.date<=t3)    items.push({id:`s${ev.id}`,emoji:"🔴",level:"紧急",color:"#FF4D4F",title:ev.title,desc});
                      else if(ev.date<=t7)    items.push({id:`s${ev.id}`,emoji:"🟠",level:"重要",color:"#FA8C16",title:ev.title,desc});
                      else if(isLow)          items.push({id:`s${ev.id}`,emoji:"🟡",level:"一般",color:"#FAAD14",title:ev.title,desc});
                      else                    items.push({id:`s${ev.id}`,emoji:"🟢",level:"已确认",color:"#52C41A",title:ev.title,desc});
                    });
                    const ord:Record<string,number>={紧急:0,敏感:1,重要:2,一般:3,方案参考:4,已确认:5};
                    const colorMap2:Record<string,string>={紧急:"#FF4D4F",重要:"#FA8C16",一般:"#FAAD14",方案参考:"#3B82F6",已确认:"#52C41A",敏感:"#8C8C8C"};
                    const emojiMap2:Record<string,string>={紧急:"🔴",重要:"🟠",一般:"🟡",方案参考:"🔵",已确认:"🟢",敏感:"⚫"};
                    items.forEach(it=>{if(priorityOverrides[it.id]){it.level=priorityOverrides[it.id];it.color=colorMap2[it.level]||it.color;it.emoji=emojiMap2[it.level]||it.emoji;}});
                    const seen=new Set<string>();
                    return items.sort((a,b)=>(ord[a.level]??9)-(ord[b.level]??9)).filter(p=>{if(seen.has(p.title))return false;seen.add(p.title);return true;}).map(item=>{
                      const done=priorityDone.has(item.id);
                      const reason=getAiReason(item.title,item.level);
                      return(
                        <div key={item.id} style={{background:`${item.color}10`,border:`1.5px solid ${item.color}44`,borderRadius:10,padding:"9px 12px",display:"flex",alignItems:"flex-start",gap:8,opacity:done?0.4:1,transition:"opacity 0.3s"}}>
                          <span style={{fontSize:15,lineHeight:1.3,flexShrink:0}}>{item.emoji}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                              <span style={{fontSize:12.5,fontWeight:700,color:"#1a1a2e",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:done?"line-through":"none"}}>{item.title}</span>
                              <span style={{fontSize:10,fontWeight:600,color:item.color,background:`${item.color}22`,padding:"1px 7px",borderRadius:8,flexShrink:0}}>{item.level}</span>
                            </div>
                            <div style={{fontSize:11,color:"#666",lineHeight:1.4,marginBottom:4}}>{item.desc}</div>
                            {/* ── AI推理说明（核心AI原生展示）── */}
                            <div style={{fontSize:10,color:"#8B9ABF",lineHeight:1.4,fontStyle:"italic",background:"#F8F9FF",padding:"3px 8px",borderRadius:5,border:"1px solid #E8EEFA"}}>
                              🤖 {reason}
                            </div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0}}>
                            <button onClick={()=>setEditingPItem({id:item.id,title:item.title,level:priorityOverrides[item.id]||item.level,desc:item.desc})} style={{width:22,height:22,borderRadius:5,border:"1px solid #d0d0d0",background:"#fff",color:"#666",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                            <button onClick={()=>{
                              const was=priorityDone.has(item.id);
                              setPriorityDone(p=>{const n=new Set(p);was?n.delete(item.id):n.add(item.id);return n;});
                              if(!was&&(item.title.includes("计网")||item.title.includes("第三章"))){setAlertBanner(false);showToast("✅ 已确认完成，提醒已清除","#52C41A");}
                            }} style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${done?"#52C41A":"#d9d9d9"}`,background:done?"#52C41A":"transparent",color:"#fff",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {done?"✓":""}
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* ── 👤 Q仔了解你（新面板）── */}
            {rightTab==="profile"&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
                <div style={{padding:"10px 12px",background:"linear-gradient(135deg,#F3E5F5 0%,#E8F0FE 100%)",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#7B68EE",marginBottom:2}}>🧠 Q仔对你的了解</div>
                  <div style={{fontSize:11,color:"#888"}}>基于近7天的真实交互行为，持续更新中</div>
                  {aiLearnLog.length>0&&(
                    <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{width:7,height:7,borderRadius:"50%",background:"#52C41A",display:"inline-block",boxShadow:"0 0 6px #52C41A"}}/>
                      <span style={{fontSize:10.5,color:"#52C41A",fontWeight:600}}>本次会话新增 {aiLearnLog.length} 条学习记录</span>
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
                          <div style={{height:"100%",width:`${(t.stars/5)*100}%`,background:`linear-gradient(90deg,#FA8C16,#FFB340)`,borderRadius:7,transition:"width 0.8s ease"}}/>
                        </div>
                        <div style={{fontSize:9,color:"#FA8C16",fontWeight:700,flexShrink:0}}>{"★".repeat(t.stars)+"☆".repeat(5-t.stars)}</div>
                      </div>
                    ))}
                    <div style={{fontSize:10,color:"#999",marginTop:4,fontStyle:"italic"}}>🤖 Q仔通过你过去的确认/忽略行为推断</div>
                  </div>

                  {/* 日常习惯 */}
                  <div style={{background:"#F0F9FF",border:"1px solid #BAE0FF",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#4A90D9",marginBottom:8}}>⏰ 你的处理习惯</div>
                    {PROFILE_DATA.habits.map((h,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:"#4A90D9",display:"inline-block",flexShrink:0}}/>
                        <span style={{fontSize:11.5,color:"#333"}}>{h}</span>
                      </div>
                    ))}
                    <div style={{fontSize:10,color:"#999",marginTop:4,fontStyle:"italic"}}>🤖 Q仔通过你的确认时间规律推断</div>
                  </div>

                  {/* 老师风格识别 */}
                  <div style={{background:"#F9F0FF",border:"1px solid #D3ADF7",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#9B59B6",marginBottom:8}}>👩‍🏫 老师风格画像</div>
                    {PROFILE_DATA.teacherStyles.map((t,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8,padding:"6px 8px",background:`${t.color}10`,borderRadius:7,border:`1px solid ${t.color}33`}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                            <span style={{fontSize:11.5,fontWeight:700,color:t.color}}>{t.name}</span>
                            <span style={{fontSize:9,padding:"1px 5px",borderRadius:6,background:t.color,color:"#fff",fontWeight:600}}>{t.tag}</span>
                          </div>
                          <div style={{fontSize:10.5,color:"#555"}}>{t.detail}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{fontSize:10,color:"#999",fontStyle:"italic"}}>🤖 Q仔通过群聊消息频率与措辞分析推断</div>
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
                      🤖 Q仔推荐：「{["温柔学姐风","毒舌室友风","佛系朋友风","正经班委风"][aiRecommendedStyleIdx]}」（响应率最高，{reminderStyleCounts[aiRecommendedStyleIdx]}/{totalStyleUses}次）
                    </div>
                  </div>

                  {/* Q仔本周建议 */}
                  <div style={{background:"linear-gradient(135deg,#FFF7E6,#FFF0F5)",border:"1px solid #FFB340",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#FA8C16",marginBottom:6}}>💡 Q仔本周建议</div>
                    <div style={{fontSize:12,color:"#333",lineHeight:1.6}}>{PROFILE_DATA.suggestion}</div>
                    <button onClick={()=>setShowCrossAnalysis(true)} style={{marginTop:8,padding:"5px 12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#FA8C16,#FFB340)",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      查看跨群详细分析 →
                    </button>
                  </div>

                  {/* Q仔学习记录 */}
                  <div style={{background:"#FAFBFD",border:"1px solid #E5E8EE",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#666",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                      📝 Q仔学习记录
                      {aiLearnLog.length>0&&<span style={{fontSize:9,background:"#52C41A",color:"#fff",padding:"1px 5px",borderRadius:6}}>+{aiLearnLog.length} 新</span>}
                    </div>
                    {allLearnLog.length===0&&<div style={{fontSize:11,color:"#bbb",textAlign:"center",padding:"10px 0"}}>暂无学习记录，开始使用Q仔后自动记录</div>}
                    {allLearnLog.slice(0,8).map((l,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,padding:"3px 0",borderBottom:i<allLearnLog.length-1?"1px dashed #F0F0F0":"none"}}>
                        <span style={{fontSize:11,color:"#52C41A",flexShrink:0}}>✓</span>
                        <span style={{fontSize:11,color:"#555",flex:1}}>{l.title}</span>
                        <span style={{fontSize:10,color:"#bbb",flexShrink:0}}>{l.time}</span>
                      </div>
                    ))}
                    <div style={{fontSize:10,color:"#bbb",marginTop:6,textAlign:"center"}}>每次你确认/调整/忽略代办，Q仔都会记录并学习</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 演示按钮（可拖动）── */}
      <div style={{position:"fixed",left:demoBarPos.x,bottom:demoBarPos.y,background:"rgba(255,255,255,0.97)",border:"1px solid #E5E5E5",borderRadius:18,padding:"8px 14px",display:"flex",flexDirection:"column",gap:6,alignItems:"stretch",boxShadow:"0 8px 32px rgba(0,0,0,0.12)",zIndex:1000,userSelect:"none"}}>
        <div onMouseDown={e=>setDemoBarDrag({startX:e.clientX,startY:e.clientY,origX:demoBarPos.x,origY:demoBarPos.y})}
          style={{cursor:demoBarDrag?"grabbing":"grab",alignSelf:"center",padding:"4px 6px",fontSize:14,color:"#999"}}>🎮</div>
        {([
          {module:"📦 代办生成",color:MODULE_COLORS.capsule,btns:[
            {label:"代办生成",action:simDDL},
            {label:"冲突检测",action:simConflict},
            {label:"手动抓取",action:simSensitive},
          ]},
          {module:"⏰ 智能提醒",color:MODULE_COLORS.remind,btns:[
            {label:"智能提醒",action:simReminder},
          ]},
          {module:"📅 群体排期",color:MODULE_COLORS.group,btns:[
            {label:"社团排期",action:()=>simGroupSched(18)},
          ]},
          {module:"💬 方案&矛盾",color:MODULE_COLORS.social,btns:[
            {label:"方案讨论",action:()=>{setActiveChat(20);setUnreadMap(p=>({...p,20:0}));}},
            {label:"矛盾化解",action:()=>{setActiveChat(21);setUnreadMap(p=>({...p,21:0}));}},
            {label:"出行讨论",action:simTravel},
          ]},
          {module:"🧠 AI 洞察",color:MODULE_COLORS.insight,btns:[
            {label:"Q仔画像",action:()=>{setRightTab("profile");setAiVisible(false);showToast("👤 已切换到「Q仔了解你」面板","#9B59B6");}},
            {label:"跨群分析",action:()=>setShowCrossAnalysis(true)},
          ]},
        ] as {module:string;color:string;btns:{label:string;action:()=>void}[]}[]).map(({module,color,btns})=>(
          <div key={module} style={{display:"flex",flexDirection:"row",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:"#888",fontWeight:600,width:72,flexShrink:0}}>{module}</span>
            <div style={{display:"flex",gap:4}}>
              {btns.map(btn=>(
                <button key={btn.label} onClick={btn.action} style={{padding:"5px 10px",borderRadius:10,border:`1.5px solid ${color}55`,background:`${color}15`,color:color,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{btn.label}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 快进按钮 */}
      <div style={{position:"fixed",right:16,bottom:90,zIndex:1002,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
        {reminderConfig&&<div style={{background:"#52C41A",color:"#fff",fontSize:9.5,fontWeight:700,padding:"2px 7px",borderRadius:8,whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>提醒已设定 {reminderConfig.sendTime}</div>}
        <button onClick={()=>{
          if(timeJumped)return;
          const rc=reminderConfig||{styleIdx:aiRecommendedStyleIdx,sendTime:"21:00",evId:7,evTitle:"📎 计网作业截止"};
          const ev=schedule.find(e=>e.id===rc.evId)||schedule.find(e=>e.title.includes("计网"))||null;
          const styleNames=["温柔学姐","毒舌室友","佛系朋友","正经班委"];
          const sname=styleNames[rc.styleIdx]||"毒舌室友";
          const styleText=ev?(getReminderStyles(ev)[rc.styleIdx]?.text||`提醒：「${rc.evTitle}」今日截止！`):`亲爱的，「${rc.evTitle}」截止今日 23:59，记得提前提交！`;
          setCapsules(p=>p.map(c=>{
            if(c.title.includes("计网作业")||c.title.includes("第三章作业")||c.title.includes("作业补充要求")){
              return {...c,importance:"high" as Priority,scheduleData:c.scheduleData?{...c.scheduleData,priority:"high" as Priority,color:"#FFF1F0"}:undefined};
            }
            return c;
          }));
          setSchedule(p=>p.map(s=>{
            if(s.title.includes("计网作业")) return {...s,priority:"high" as Priority,color:"#FFF1F0"};
            return s;
          }));
          setTimeJumped(true);setActiveChat(9);setUnreadMap(p=>({...p,9:0}));
          showToast(`⏩ 时间快进至 5月6日 ${rc.sendTime}`,"#7B68EE");
          setTimeout(()=>{
            const nm:Message={id:Date.now(),sender:"Q仔",isAI:true,content:`⏰【自动提醒 · ${sname}风】\n\n${styleText}\n\n──\n📅 发送时间：5月6日 ${rc.sendTime}（截止前3小时）\n🤖 提醒风格由 Q仔 根据你的响应历史自动选择`,time:rc.sendTime,self:false,date:"5月6日 周三"};
            setMessages(p=>({...p,9:[...(p[9]||[]),nm]}));
            setAlertBanner(true);
          },600);
        }} style={{width:60,height:60,borderRadius:"50%",background:timeJumped?"#8C8C8C":"linear-gradient(135deg,#FF6B6B,#FF4D4F)",color:"#fff",border:"none",cursor:timeJumped?"default":"pointer",boxShadow:`0 4px 20px ${timeJumped?"rgba(0,0,0,0.15)":"rgba(255,77,79,0.5)"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,transition:"all 0.3s"}}>
          <span style={{fontSize:18}}>⏩</span>
          <span style={{fontSize:9,fontWeight:700}}>{timeJumped?"已快进":"快进"}</span>
        </button>
        <div style={{fontSize:9,color:"#999",textAlign:"center",lineHeight:1.3}}>快进至<br/>5月6日</div>
      </div>

      {/* ── 弹窗：添加/编辑日程 ── */}
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

      {/* ── 弹窗：导入日程 ── */}
      {showImportModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setShowImportModal(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:"24px",width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:6}}>📥 导入日程/课表</div>
            <div style={{fontSize:12,color:"#999",marginBottom:18}}>支持图片识别、文件上传、教务系统直连</div>
            {importStep==="choose"&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  {[{icon:"🖼️",label:"图片识别",desc:"上传课表截图\nAI 识别课程",color:"#4A90D9"},{icon:"📄",label:"PDF / Word",desc:"上传课表文件\n自动解析",color:"#FA8C16"},{icon:"🏫",label:"教务系统",desc:"账号密码登录\n直接同步",color:"#52C41A"},{icon:"📆",label:"日程表",desc:"iCal/日历同步\n一键导入",color:"#9B59B6"}].map(opt=>(
                    <button key={opt.label} onClick={()=>handleImport(opt.label)} style={{padding:"14px 12px",borderRadius:10,border:`1.5px solid ${opt.color}55`,background:`${opt.color}10`,color:"#333",cursor:"pointer",textAlign:"left"}}>
                      <div style={{fontSize:24,marginBottom:4}}>{opt.icon}</div>
                      <div style={{fontSize:13,fontWeight:700,color:opt.color,marginBottom:3}}>{opt.label}</div>
                      <div style={{fontSize:10.5,color:"#666",lineHeight:1.4,whiteSpace:"pre-line"}}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <div style={{fontSize:11,color:"#bbb",textAlign:"center"}}>⚠️ 演示用途，点击任意方式模拟导入流程</div>
              </>
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

      {/* ── 弹窗：智能提醒（增强版 · AI预选）── */}
      {reminderEv&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>{setReminderEv(null);setSentReminder(false);}}>
          <div style={{background:"#fff",borderRadius:16,padding:"26px",width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:800,color:"#333",marginBottom:4}}>💬 生成提醒文案</div>
            <div style={{fontSize:12,color:"#4A90D9",background:"#EFF6FF",padding:"6px 10px",borderRadius:8,marginBottom:10,fontWeight:500}}>
              针对：{reminderEv.title}　{reminderEv.date.slice(5).replace("-","/")} {reminderEv.startTime}
              <span style={{marginLeft:8,fontSize:10,color:prColor(reminderEv.priority),fontWeight:700}}>{reminderEv.priority==="high"?"🔴 紧急":reminderEv.priority==="medium"?"🟠 重要":"🟡 一般"}</span>
            </div>
            {/* ── AI 预选推荐横幅（核心改动）── */}
            <div style={{background:"linear-gradient(135deg,#F0F7FF,#F3E5F5)",border:"1.5px solid #BAE0FF",borderRadius:10,padding:"8px 12px",marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
              <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>Q</div>
              <div>
                <div style={{fontSize:11.5,fontWeight:700,color:"#4A90D9",marginBottom:2}}>🤖 Q仔智能推荐</div>
                <div style={{fontSize:11,color:"#555",lineHeight:1.5}}>
                  根据你过去 {totalStyleUses} 次提醒记录，「<strong style={{color:"#7B68EE"}}>
                    {["温柔学姐风","毒舌室友风","佛系朋友风","正经班委风"][aiRecommendedStyleIdx]}
                  </strong>」风格响应率最高（{reminderStyleCounts[aiRecommendedStyleIdx]}/{totalStyleUses}次），已为你预选。
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
              {remStyles.map((s,i)=>(
                <button key={i} onClick={()=>{
                  setSelStyle(i);
                  setReminderStyleCounts(p=>({...p,[i]:(p[i]||0)+1}));
                }} style={{padding:"5px 10px",borderRadius:10,border:`1.5px solid ${selStyle===i?"#4A90D9":"#E5E8EE"}`,background:selStyle===i?"#E8F0FE":"#fff",color:selStyle===i?"#4A90D9":"#666",fontSize:11.5,cursor:"pointer",fontWeight:selStyle===i?700:400,position:"relative"}}>
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
                    <button key={opt} onClick={()=>setReminderTimeOpt(opt)} style={{padding:"4px 10px",borderRadius:8,border:`1.5px solid ${reminderTimeOpt===opt?"#4A90D9":"#E5E8EE"}`,background:reminderTimeOpt===opt?"#E8F0FE":"#fff",color:reminderTimeOpt===opt?"#4A90D9":"#666",fontSize:11,cursor:"pointer",fontWeight:reminderTimeOpt===opt?700:400}}>
                      {lbs[opt]}
                    </button>
                  );
                })}
              </div>
              {reminderTimeOpt==="custom"&&(
                <input type="time" value={reminderCustomT} onChange={e=>setReminderCustomT(e.target.value)} style={{height:32,padding:"0 8px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333",marginBottom:5}}/>
              )}
              <div style={{fontSize:11,color:"#999",marginTop:2}}>
                将于 <strong style={{color:"#4A90D9"}}>{computeSendTime(reminderTimeOpt,reminderCustomT,reminderEv)}</strong> 自动发送提醒
              </div>
            </div>
            {!sentReminder?(
              <button onClick={()=>{
                const st=computeSendTime(reminderTimeOpt,reminderCustomT,reminderEv!);
                setReminderConfig({styleIdx:selStyle,sendTime:st,evId:reminderEv!.id,evTitle:reminderEv!.title});
                setSentReminder(true);
                // 记录到学习日志
                const styleNames=["温柔学姐风","毒舌室友风","佛系朋友风","正经班委风"];
                // ═══════════════════════════════════════════════════════════════
// 续接处：上一段代码末尾是：
//   setAiLearnLog(p=>[...p,{from:"",to:styleNames[selStyle],title:"提醒风格选择",time:new Date
// 从这里接续：
// ═══════════════════════════════════════════════════════════════

setAiLearnLog(p=>[...p,{
  from:"",
  to:styleNames[selStyle],
  title:"提醒风格选择",
  time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}),
}]);
}} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
一键发送提醒
</button>
):(
<div style={{textAlign:"center",padding:"10px 0"}}>
<div style={{color:"#52C41A",fontWeight:700,fontSize:14}}>
  ✅ 提醒已设定！将于 <span style={{color:"#4A90D9"}}>{reminderConfig?.sendTime}</span> 自动发送
</div>
{/* AI学习反馈 */}
<div style={{marginTop:8,background:"linear-gradient(135deg,#F3E5F5,#E8F0FE)",border:"1px solid #D3B8E0",borderRadius:8,padding:"6px 12px",fontSize:11,color:"#7B68EE",lineHeight:1.5}}>
  ✨ Q仔已记录：你选择了「{["温柔学姐风","毒舌室友风","佛系朋友风","正经班委风"][selStyle]}」，
  下次同类提醒将优先推荐此风格（已记录 {reminderStyleCounts[selStyle]} 次）
</div>
</div>
)}
</div>
</div>
)}

{/* ── 弹窗：群体排期分析 ── */}
{groupSchedM&&GROUP_SCHED[groupSchedM.chatId]&&(()=>{
const data=GROUP_SCHED[groupSchedM.chatId];
return(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>setGroupSchedM(null)}>
<div style={{background:"#fff",borderRadius:16,padding:"26px",width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
<div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:4}}>📊 Q仔 · 群体排期分析</div>
<div style={{fontSize:12,color:"#999",marginBottom:16}}>「{data.gName}」· 共 {data.total} 人参与统计</div>
{/* AI推理说明 */}
<div style={{background:"linear-gradient(135deg,#F0F7FF,#F5F0FF)",border:"1px solid #BAE0FF",borderRadius:10,padding:"8px 12px",marginBottom:14,display:"flex",gap:6,alignItems:"flex-start"}}>
<div style={{width:20,height:20,borderRadius:5,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>Q</div>
<div style={{fontSize:10.5,color:"#4A90D9",lineHeight:1.5}}>
  🤖 Q仔分析了 {data.total} 条时间回复，识别关键约束：小冯5月10日前有项目截止，排除该期；综合参与率与时间分布，推荐最优时段。
</div>
</div>
<div style={{marginBottom:18}}>
{data.slots.map((s,i)=>(
  <div key={i} style={{marginBottom:10}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
      <span style={{fontSize:12.5,color:"#333",fontWeight:i===0?700:400}}>{i===0?"🏆 ":""}{s.label}</span>
      <span style={{fontSize:12,fontWeight:700,color:i===0?"#52C41A":"#666"}}>{s.pct}% ({s.count}/{data.total}人)</span>
    </div>
    <div style={{height:20,background:"#F5F5F5",borderRadius:10,overflow:"hidden",position:"relative"}}>
      <div style={{height:"100%",width:`${s.pct}%`,background:i===0?"linear-gradient(90deg,#52C41A,#73D13D)":"linear-gradient(90deg,#4A90D9,#7B68EE)",borderRadius:10,transition:"width 0.8s ease",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:6}}>
        {s.pct>25&&<span style={{fontSize:10,color:"#fff",fontWeight:600}}>{s.who.slice(0,15)}</span>}
      </div>
    </div>
  </div>
))}
</div>
<div style={{background:"#F6FFED",border:"1px solid #95DE64",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
<div style={{fontSize:13,fontWeight:700,color:"#52C41A",marginBottom:4}}>🏆 推荐最佳时间</div>
<div style={{fontSize:14,fontWeight:800,color:"#333",marginBottom:4}}>{data.best.label}</div>
<div style={{fontSize:12,color:"#666",marginBottom:4}}>参与率 {data.best.pct}%，{data.total} 人中 {Math.round(data.total*data.best.pct/100)} 人可参与</div>
<div style={{fontSize:11,color:"#999"}}>{data.note}</div>
</div>
<button onClick={()=>{
const nev:ScheduleEvent={id:Date.now(),date:data.best.date,startTime:data.best.sT,endTime:data.best.eT,title:data.best.title,type:"event",color:data.best.color,priority:"medium"};
setSchedule(p=>{const ex=p.some(e=>e.title===nev.title&&e.date===nev.date);return ex?p:[...p,nev];});
setSchDate(data.best.date);setRightTab("schedule");
const nid=nev.id;
setTimeout(()=>setHighlightId(nid),200);setTimeout(()=>setHighlightId(null),3000);
const _cid=groupSchedM.chatId;
setGroupSchedM(null);
showToast(`✅ 已写入日程：${data.best.label}`,"#52C41A");
const _notice:Message={id:Date.now()+200,sender:"Q仔",isAI:true,content:`📅【排期确认通知】\n\n「${data.gName}」活动时间已正式确定！\n\n🕐 时间：${data.best.label}\n📅 日期：${data.best.date}\n👥 参与人数：${data.total} 人中约 ${Math.round(data.total*data.best.pct/100)} 人（${data.best.pct}%）\n📌 ${data.note}\n\n🤖 Q仔已为参与者写入个人日程，请各成员提前安排好行程，准时出席！`,time:"10:49",self:false};
setMessages((p:Record<number,Message[]>)=>({...p,[_cid]:[...p[_cid],_notice]}));
}} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#52C41A,#73D13D)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ 确认最佳时间，写入日程并通知群成员</button>
</div>
</div>
);
})()}

{/* ── 弹窗：航班实时状态 ── */}
{flightModal&&FLIGHTS[flightModal]&&(()=>{
const f=FLIGHTS[flightModal];
const isDelay=f.status==="延误";
return(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3500}} onClick={()=>setFlightModal(null)}>
<div style={{background:"#fff",borderRadius:16,padding:"24px",width:420,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
<span style={{fontSize:24}}>✈️</span>
<div style={{flex:1}}>
  <div style={{fontSize:18,fontWeight:800,color:"#333"}}>{f.flightNo}</div>
  <div style={{fontSize:11,color:"#999"}}>东方航空 · 实时状态</div>
</div>
<span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:8,background:isDelay?"#FFF1F0":"#F6FFED",color:isDelay?"#FF4D4F":"#52C41A"}}>{f.status}</span>
</div>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"18px 0",padding:"14px",background:"#FAFBFD",borderRadius:10}}>
<div style={{textAlign:"center",flex:1}}>
  <div style={{fontSize:18,fontWeight:800,color:"#333"}}>{f.sTime}</div>
  <div style={{fontSize:11,color:"#666",marginTop:3}}>{f.from}</div>
</div>
<div style={{flex:1,padding:"0 8px",textAlign:"center"}}>
  <div style={{fontSize:10,color:"#999",marginBottom:4}}>飞行约 2h25min</div>
  <div style={{height:1,background:isDelay?"#FF4D4F":"#52C41A",position:"relative"}}>
    <span style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",fontSize:14}}>{isDelay?"⚠️":"✈️"}</span>
  </div>
</div>
<div style={{textAlign:"center",flex:1}}>
  <div style={{fontSize:18,fontWeight:800,color:"#333"}}>{f.eTime}</div>
  <div style={{fontSize:11,color:"#666",marginTop:3}}>{f.to}</div>
</div>
</div>
{isDelay&&(
<div style={{background:"#FFF1F0",border:"1.5px solid #FFA39E",borderRadius:10,padding:"10px 12px",marginBottom:14}}>
  <div style={{fontSize:13,fontWeight:700,color:"#FF4D4F",marginBottom:4}}>⚠️ 航班变更通知</div>
  <div style={{fontSize:12,color:"#666",lineHeight:1.6}}>{f.delay}</div>
</div>
)}
<div style={{fontSize:11.5,color:"#666",lineHeight:1.8,marginBottom:14}}>
<div>🚪 登机口：{f.gate}</div>
<div>📅 日期：2026年5月10日（周六）</div>
<div>🎫 座位：23A / 23B（已选）</div>
</div>
<div style={{background:"#E6FFFB",border:"1px solid #87E8DE",borderRadius:10,padding:"10px 12px",marginBottom:14}}>
<div style={{fontSize:12,color:"#13C2C2",fontWeight:700,marginBottom:3}}>🤖 Q仔出行监控说明</div>
<div style={{fontSize:11,color:"#555",lineHeight:1.5}}>
  {isDelay
    ?"Q仔已检测到延误，已自动生成代办通知，建议提前30分钟出发应对变更。"
    :"航班状态正常，Q仔将每30分钟轮询一次，发现变更立即推送。"}
</div>
</div>
<button onClick={()=>{setFlightModal(null);setRightTab("capsule");}} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>查看代办 →</button>
</div>
</div>
);
})()}

{/* ══════════════════════════════════════════════════════
── 新功能：跨群智能分析弹窗 ──
展示AI跨信息源整合推理，是普通工具做不到的AI原生能力
══════════════════════════════════════════════════════ */}
{showCrossAnalysis&&(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:4000}} onClick={()=>setShowCrossAnalysis(false)}>
<div style={{background:"#fff",borderRadius:18,padding:"28px",width:500,boxShadow:"0 24px 80px rgba(0,0,0,0.18)",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
{/* 标题 */}
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
<div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#9B59B6,#4A90D9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#fff"}}>Q</div>
<div>
<div style={{fontSize:16,fontWeight:800,color:"#333"}}>🔗 Q仔跨群智能分析</div>
<div style={{fontSize:11,color:"#999"}}>跨越 5 个群聊 · 整合本周全部关键事项</div>
</div>
<button onClick={()=>setShowCrossAnalysis(false)} style={{marginLeft:"auto",background:"none",border:"none",fontSize:20,color:"#bbb",cursor:"pointer"}}>×</button>
</div>

{/* AI推理能力说明 */}
<div style={{background:"linear-gradient(135deg,#F3E5F5,#E8F0FE)",border:"1.5px solid #D3B8E0",borderRadius:10,padding:"10px 14px",marginBottom:18}}>
<div style={{fontSize:11.5,fontWeight:700,color:"#7B68EE",marginBottom:4}}>🤖 这是 AI 才能做到的事</div>
<div style={{fontSize:11,color:"#555",lineHeight:1.6}}>
Q仔同时读取了你的 5 个群聊 + 课表 + 代办，发现了以下你自己没有意识到的时间冲突和风险。普通日历只能看到你手动输入的事，Q仔能理解聊天里产生的时间。
</div>
</div>

{/* 核心发现：5月6日双线截止 */}
<div style={{background:"#FFF1F0",border:"2px solid #FF7875",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
<span style={{fontSize:18}}>🚨</span>
<div style={{fontSize:14,fontWeight:800,color:"#FF4D4F"}}>高风险日：5月6日（周三）</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
{[
  {group:"计算机网络 · 课程群", event:"计网作业截止 23:59", priority:"必须", color:"#FF4D4F", teacher:"张老师", note:"从不延期，本学期第3次提醒"},
  {group:"Team Phoenix · 创新赛", event:"初赛材料提交 23:59", priority:"必须", color:"#FF6B6B", teacher:"队友 周", note:"PPT v3仍有待优化问题"},
  {group:"操作系统课程群", event:"实验3答辩（次日14:00）", priority:"需提前准备", color:"#FA8C16", teacher:"助教", note:"需要5分钟PPT，10分钟提问"},
].map((item,i)=>(
  <div key={i} style={{display:"flex",gap:10,padding:"8px 10px",background:"rgba(255,77,79,0.05)",borderRadius:8,border:`1px solid ${item.color}33`}}>
    <div style={{width:4,borderRadius:2,background:item.color,flexShrink:0}}/>
    <div style={{flex:1}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
        <span style={{fontSize:12,fontWeight:700,color:"#333"}}>{item.event}</span>
        <span style={{fontSize:9,background:item.color,color:"#fff",padding:"1px 5px",borderRadius:5,fontWeight:700}}>{item.priority}</span>
      </div>
      <div style={{fontSize:10.5,color:"#666"}}>来源：{item.group}</div>
      <div style={{fontSize:10,color:item.color,fontWeight:600,marginTop:1}}>⚠️ {item.teacher}：{item.note}</div>
    </div>
  </div>
))}
</div>
{/* AI时间测算 */}
<div style={{background:"rgba(255,77,79,0.08)",borderRadius:8,padding:"8px 10px"}}>
<div style={{fontSize:11.5,fontWeight:700,color:"#FF4D4F",marginBottom:4}}>🤖 Q仔时间测算</div>
<div style={{fontSize:11,color:"#555",lineHeight:1.6}}>
  · 本周（4/29–5/6）你有效工作时间约 <strong>28小时</strong><br/>
  · 课程占用：16小时 | 组会占用：3小时<br/>
  · 可用于两项截止任务的净时间：约 <strong>4–5小时</strong><br/>
  · 计网作业（3000字）预计需 3h | 创新赛PPT优化预计需 2h<br/>
  · <strong style={{color:"#FF4D4F"}}>结论：时间非常紧张，两件事均不能拖到最后一天。</strong>
</div>
</div>
</div>

{/* AI行动建议 */}
<div style={{background:"#F6FFED",border:"1.5px solid #95DE64",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
<div style={{fontSize:13,fontWeight:800,color:"#52C41A",marginBottom:10}}>💡 Q仔的行动建议（按优先级）</div>
{[
{day:"今晚（4/29）",action:"先完成课题组组会（必须），晚上开始写计网作业框架",color:"#FF4D4F",icon:"🔴"},
{day:"4/30–5/3",action:"每天1小时写计网作业，五一假期利用好，5/3前完成初稿",color:"#FA8C16",icon:"🟠"},
{day:"5/4–5/5",action:"创新赛PPT优化，补充商业模式和用户画像，5/5定稿留buffer",color:"#FA8C16",icon:"🟠"},
{day:"5/6 白天",action:"计网作业最终检查并提交（双平台），下午放松准备操作系统答辩",color:"#52C41A",icon:"🟢"},
].map((item,i)=>(
<div key={i} style={{display:"flex",gap:8,marginBottom:8,padding:"6px 0",borderBottom:i<3?"1px dashed #D9F7BE":"none"}}>
  <span style={{fontSize:13,flexShrink:0}}>{item.icon}</span>
  <div>
    <div style={{fontSize:11,fontWeight:700,color:item.color,marginBottom:2}}>{item.day}</div>
    <div style={{fontSize:11.5,color:"#333",lineHeight:1.4}}>{item.action}</div>
  </div>
</div>
))}
</div>

{/* 其他本周事项 */}
<div style={{background:"#FFFBE6",border:"1px solid #FFE58F",borderRadius:10,padding:"10px 14px",marginBottom:14}}>
<div style={{fontSize:12,fontWeight:700,color:"#FAAD14",marginBottom:8}}>📅 本周其他事项（Q仔已归档）</div>
{[
{icon:"🔬",event:"课题组组会 16:30-19:30",date:"今天 4/29",note:"翁老师重视中间数据展示"},
{icon:"✈️",event:"重庆出行 MU5435（延误监控中）",date:"5/10 周六",note:"航班延误40分钟，已生成代办"},
{icon:"🎓",event:"班级团建 紫金山徒步",date:"5/18 周日",note:"与创新创业讲座冲突，需取舍"},
{icon:"🌿",event:"志愿服务 图书馆整理",date:"5/12 周一",note:"已报名，需要8:00到位"},
].map((item,i)=>(
<div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:6}}>
  <span style={{fontSize:13,flexShrink:0}}>{item.icon}</span>
  <div style={{flex:1}}>
    <div style={{fontSize:11.5,fontWeight:600,color:"#333"}}>{item.event}</div>
    <div style={{fontSize:10.5,color:"#999"}}>{item.date} · {item.note}</div>
  </div>
</div>
))}
</div>

{/* 底部说明：为何普通工具做不到 */}
<div style={{background:"#F5F5F5",borderRadius:8,padding:"8px 12px",marginBottom:14}}>
<div style={{fontSize:10.5,color:"#888",lineHeight:1.6}}>
📌 <strong>Q仔做了什么：</strong>
跨越「计网群」「竞赛群」「课题组群」「班级群」「出行聊天」5个来源，
识别出3个同天截止的事项，推算了你的净可用时间，生成了分天行动计划。
这些信息没有一条是你手动录入的——全部来自聊天。
</div>
</div>

<div style={{display:"flex",gap:8}}>
<button onClick={()=>{
setShowCrossAnalysis(false);
setRightTab("priority");
setAiVisible(false);
showToast("🎯 已跳转到优先级面板，查看详细安排","#9B59B6");
}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#9B59B6,#4A90D9)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
查看优先级安排 →
</button>
<button onClick={()=>setShowCrossAnalysis(false)} style={{padding:"10px 16px",borderRadius:10,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>
关闭
</button>
</div>
</div>
</div>
)}

{/* ── 弹窗：编辑优先级条目 ── */}
{editingPItem&&(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setEditingPItem(null)}>
<div style={{background:"#fff",borderRadius:16,padding:"24px",width:380,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
<div style={{fontSize:15,fontWeight:800,color:"#333",marginBottom:4}}>✏️ 调整优先级</div>
{/* AI学习提示 */}
<div style={{background:"linear-gradient(135deg,#F3E5F5,#E8F0FE)",border:"1px solid #D3B8E0",borderRadius:8,padding:"6px 10px",marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
<span style={{fontSize:14}}>✨</span>
<span style={{fontSize:10.5,color:"#7B68EE",lineHeight:1.4}}>修改后 Q仔会记录你的偏好，下次遇到同类任务会自动参考此调整</span>
</div>
<div style={{marginBottom:12}}>
<div style={{fontSize:12,color:"#666",marginBottom:4}}>事项名称</div>
<input value={editingPItem.title} onChange={e=>setEditingPItem(p=>p?{...p,title:e.target.value}:null)}
style={{width:"100%",height:34,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333",boxSizing:"border-box"}}/>
</div>
<div style={{marginBottom:12}}>
<div style={{fontSize:12,color:"#666",marginBottom:4}}>备注说明</div>
<input value={editingPItem.desc} onChange={e=>setEditingPItem(p=>p?{...p,desc:e.target.value}:null)}
style={{width:"100%",height:34,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333",boxSizing:"border-box"}}/>
</div>
<div style={{marginBottom:14}}>
<div style={{fontSize:12,color:"#666",marginBottom:8}}>调整优先级</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{[
  {l:"紧急",e:"🔴",c:"#FF4D4F"},
  {l:"重要",e:"🟠",c:"#FA8C16"},
  {l:"一般",e:"🟡",c:"#FAAD14"},
  {l:"已确认",e:"🟢",c:"#52C41A"},
  {l:"方案参考",e:"🔵",c:"#3B82F6"},
].map(opt=>(
  <button key={opt.l} onClick={()=>setEditingPItem(p=>p?{...p,level:opt.l}:null)}
    style={{padding:"6px 12px",borderRadius:10,border:`2px solid ${editingPItem.level===opt.l?opt.c:"#E5E8EE"}`,background:editingPItem.level===opt.l?`${opt.c}15`:"#fff",color:editingPItem.level===opt.l?opt.c:"#666",fontSize:12,fontWeight:editingPItem.level===opt.l?700:400,cursor:"pointer"}}>
    {opt.e} {opt.l}
  </button>
))}
</div>
</div>
{/* 预览AI推理 */}
<div style={{background:"#F8F9FF",border:"1px solid #E8EEFA",borderRadius:8,padding:"8px 10px",marginBottom:14}}>
<div style={{fontSize:10,color:"#8B9ABF",marginBottom:2,fontWeight:600}}>调整后 Q仔的推理依据将更新为：</div>
<div style={{fontSize:10.5,color:"#555",fontStyle:"italic",lineHeight:1.4}}>
🤖 {getAiReason(editingPItem.title,editingPItem.level)}
{editingPItem.level!==editingPItem.desc.slice(0,2)&&` · 已根据你的手动调整更新判断`}
</div>
</div>
<div style={{display:"flex",gap:8}}>
<button onClick={()=>{
if(!editingPItem)return;
const colorMap2:Record<string,string>={紧急:"#FF4D4F",重要:"#FA8C16",一般:"#FAAD14",方案参考:"#3B82F6",已确认:"#52C41A",敏感:"#8C8C8C"};
const emojiMap2:Record<string,string>={紧急:"🔴",重要:"🟠",一般:"🟡",方案参考:"🔵",已确认:"🟢",敏感:"⚫"};
// 找出原始level
const origOverride=priorityOverrides[editingPItem.id];
const origLevel=origOverride||editingPItem.desc;
if(origLevel!==editingPItem.level){
  const now=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
  setAiLearnLog(p=>[...p,{from:origOverride||"AI推荐",to:editingPItem.level,title:editingPItem.title,time:now}]);
  showToast(`✨ Q仔已记录：将「${editingPItem.title.slice(0,10)}」调为${editingPItem.level}，下次同类任务自动参考`,"#7B68EE");
} else {
  showToast("✅ 已保存","#52C41A");
}
setPriorityOverrides(p=>({...p,[editingPItem.id]:editingPItem.level}));
setEditingPItem(null);
}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>保存 · Q仔记录此偏好</button>
<button onClick={()=>{
setPriorityDone(p=>new Set([...p,editingPItem.id]));
setEditingPItem(null);
showToast("🗑️ 已从优先级列表移除","#8C8C8C");
}} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #ffa39e",background:"#fff",color:"#FF4D4F",fontSize:13,cursor:"pointer"}}>删除</button>
<button onClick={()=>setEditingPItem(null)} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>取消</button>
</div>
</div>
</div>
)}

{/* ── 弹窗：敏感信息解锁 ── */}
{sensitiveCapId!==null&&(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:4000}} onClick={()=>{setSensitiveCapId(null);setSensitiveInput("");}}>
<div style={{background:"#fff",borderRadius:16,padding:"26px",width:360,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
<div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:6}}>🔐 敏感信息保护</div>
<div style={{background:"#F5F5F5",border:"1px solid #E5E8EE",borderRadius:8,padding:"8px 10px",marginBottom:12}}>
<div style={{fontSize:10.5,color:"#666",lineHeight:1.5}}>
🤖 Q仔已对该内容进行本地 AES-256 加密存储。云端仅存储「该聊天提到了账号信息」这一指针，无法还原实际内容。请输入你设置的访问密码查看。
</div>
</div>
<input type="password" value={sensitiveInput} autoFocus
onChange={e=>setSensitiveInput(e.target.value)}
onKeyDown={e=>{
if(e.key!=="Enter")return;
if(sensitiveInput==="666"){
  setUnlockedCaps(p=>new Set([...p,sensitiveCapId!]));
  setSensitiveCapId(null);setSensitiveInput("");
  showToast("🔓 验证通过，账号密码已显示","#52C41A");
} else {
  showToast("❌ 密码错误","#FF4D4F");
}
}}
placeholder="输入访问密码…"
style={{width:"100%",height:42,padding:"0 12px",border:"1.5px solid #E5E8EE",borderRadius:8,fontSize:14,outline:"none",color:"#333",boxSizing:"border-box",marginBottom:16}}/>
<div style={{display:"flex",gap:8}}>
<button onClick={()=>{
if(sensitiveInput==="666"){
  setUnlockedCaps(p=>new Set([...p,sensitiveCapId!]));
  setSensitiveCapId(null);setSensitiveInput("");
  showToast("🔓 已解锁","#52C41A");
} else {
  showToast("❌ 密码错误","#FF4D4F");
}
}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>确认解锁</button>
<button onClick={()=>{setSensitiveCapId(null);setSensitiveInput("");}} style={{padding:"10px 16px",borderRadius:10,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>取消</button>
</div>
<div style={{fontSize:11,color:"#bbb",textAlign:"center",marginTop:10}}>演示密码：666</div>
</div>
</div>
)}

{/* ── 全局样式 ── */}
<style>{`
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #D9DCE0; border-radius: 4px; }
input::placeholder { color: #BFBFBF; }
`}</style>
</div>
);
}


