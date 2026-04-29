"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

// ────────────────────────────────────────────────────────────
//  类型定义
// ────────────────────────────────────────────────────────────
type ChatType = "group" | "private";
type Chat = {
  id: number; type: ChatType; name: string; category: string;
  avatar: string; color: string; count?: number;
  lastTime: string; lastMsg: string; unread: number;
  pinned?: boolean; online?: boolean;
};
type Message = {
  id: number; sender: string; content: string; time: string;
  self: boolean; isAI?: boolean; date?: string; isSystem?: boolean; atMe?: boolean;
};
type Priority = "high" | "medium" | "low";
type ScheduleEvent = {
  id: number; date: string; startTime: string; endTime: string;
  title: string; location?: string;
  type: "class" | "task" | "event" | "exam";
  color: string; priority?: Priority;
  fromCapsule?: boolean; groupName?: string;
};
type CapsuleType = "pending" | "confirmed" | "conflict" | "plan" | "sensitive";
type Capsule = {
  id: number; type: CapsuleType; importance: Priority;
  group: string; title: string; content: string; time: string;
  from: string; new: boolean; scheduleData?: Partial<ScheduleEvent>;
  createdAt?: string;
};
type AiMsg = { role: "user" | "ai"; content: string };
type CtxMenu = { x: number; y: number; msg: Message; cid: number } | null;
type CapsuleFilter = "all" | "week" | "month" | "high" | "conflict" | "confirmed";
type EventForm = { title: string; date: string; startTime: string; endTime: string; location: string; type: ScheduleEvent["type"]; priority: Priority; };

// ────────────────────────────────────────────────────────────
//  聊天列表
// ────────────────────────────────────────────────────────────
const CHATS: Chat[] = [
  { id:1,  type:"group",   name:"2026PCG校园AI产品创意大赛官方沟通群", category:"竞赛",    avatar:"🏆", color:"#FF6B6B", count:1010, lastTime:"15:08", lastMsg:"云上枫加入了群聊",          unread:9, pinned:true },
  { id:2,  type:"group",   name:"王老师课题组 | 光学组",               category:"科研",    avatar:"🔬", color:"#7B68EE", count:18,   lastTime:"16:32", lastMsg:"翁一士: 明日组会线上",       unread:6, pinned:true },
  { id:3,  type:"private", name:"张师兄",                              category:"联系人",  avatar:"张", color:"#52C41A",             lastTime:"15:42", lastMsg:"图纸我下午发你",            unread:1, online:true },
  { id:4,  type:"group",   name:"计算机网络 · 课程群",                 category:"课程",    avatar:"📡", color:"#4A90D9", count:247,  lastTime:"14:20", lastMsg:"张老师: 周五DDL，提交学习通", unread:3 },
  { id:5,  type:"group",   name:"数据结构与算法-2024秋",               category:"课程",    avatar:"📚", color:"#1989FA", count:189,  lastTime:"11:08", lastMsg:"[图片]",                   unread:0 },
  { id:6,  type:"group",   name:"操作系统课程群",                      category:"课程",    avatar:"💻", color:"#13C2C2", count:156,  lastTime:"昨天",  lastMsg:"助教: 实验3报告模板已上传",  unread:0 },
  { id:7,  type:"group",   name:"计科2101班级群",                      category:"班级",    avatar:"🎓", color:"#52C41A", count:32,   lastTime:"10:45", lastMsg:"班长: 班费收缴通知",         unread:2 },
  { id:8,  type:"group",   name:"计算机学院2026届毕业群",              category:"学院",    avatar:"🏫", color:"#FA8C16", count:487,  lastTime:"昨天",  lastMsg:"[公告] 毕业论文盲审说明",    unread:0 },
  { id:9,  type:"group",   name:"Team Phoenix · 创新创业大赛",         category:"竞赛",    avatar:"🔥", color:"#FF4D4F", count:5,    lastTime:"13:22", lastMsg:"我把PPT v3发群里了",         unread:4 },
  { id:10, type:"private", name:"队友 刘正昂",                         category:"联系人",  avatar:"刘", color:"#FF6B6B",             lastTime:"01:48", lastMsg:"[图片]",                   unread:0 },
  { id:11, type:"group",   name:"光影摄影社·成员群",                   category:"社团",    avatar:"📷", color:"#9B59B6", count:89,   lastTime:"昨天",  lastMsg:"周六外拍改情人谷",           unread:0 },
  { id:12, type:"group",   name:"校学生会宣传部",                      category:"学生组织",avatar:"📢", color:"#FFB347", count:24,   lastTime:"周一",  lastMsg:"[文件] 5月活动排期.xlsx",    unread:0 },
  { id:13, type:"private", name:"小美 💕",                             category:"好友",    avatar:"美", color:"#FF85A2",             lastTime:"11:38", lastMsg:"👍 中山陵下午2点见",         unread:0, online:true },
  { id:14, type:"private", name:"班长 李同学",                         category:"联系人",  avatar:"李", color:"#52C41A",             lastTime:"10:50", lastMsg:"班费的事麻烦下",             unread:1 },
  { id:15, type:"private", name:"妈妈 ❤️",                            category:"家人",    avatar:"妈", color:"#F5222D",             lastTime:"昨天",  lastMsg:"记得吃饭啊孩子",             unread:0 },
  { id:16, type:"group",   name:"毕业摆烂群😴",                        category:"闲聊",    avatar:"🛋️",color:"#8C8C8C", count:8,    lastTime:"昨天",  lastMsg:"今天又没去图书馆",           unread:0 },
  { id:17, type:"group",   name:"校园活动志愿者群",                    category:"活动",    avatar:"🎪", color:"#36CFC9", count:64,   lastTime:"周日",  lastMsg:"5/12志愿排班已出",           unread:0 },
];

// ────────────────────────────────────────────────────────────
//  消息（每个会话 20+ 条）
// ────────────────────────────────────────────────────────────
const INITIAL_MESSAGES: Record<number, Message[]> = {
  1: [
    { id:1,  sender:"system",        content:"hzh加入了群聊",            time:"14:15", self:false, isSystem:true },
    { id:2,  sender:"system",        content:"Ashley加入了群聊",         time:"14:16", self:false, isSystem:true },
    { id:3,  sender:"大赛官助sasa",  content:"🎉【PCG校园AI产品创意大赛·选手沟通群公告】Hi～欢迎各位参赛选手！本次大赛由腾讯PCG主办，聚焦AI Native产品方案设计与落地，旨在发掘最具创造力的校园团队。", time:"14:20", self:false, date:"4月22日 周二" },
    { id:4,  sender:"大赛官助sasa",  content:"📌 重要时间节点：\n• 报名截止：5月10日 23:59\n• 初赛作品提交：5月20日 23:59\n• 决赛答辩：6月15日 线下", time:"14:21", self:false },
    { id:5,  sender:"auto_thefience",content:"好嘟好嘟😘",              time:"14:25", self:false },
    { id:6,  sender:"白芨",          content:"我用的腾讯送的混元大模型", time:"15:04", self:false },
    { id:7,  sender:"Ashley",        content:"请问初赛是提交PPT还是Demo视频？两个都要吗", time:"15:30", self:false },
    { id:8,  sender:"大赛官助小刘",  content:"@Ashley 都需要：1份产品PPT（不超过20页）+ 1段Demo视频（不超过5分钟），打包发到比赛邮箱", time:"15:32", self:false },
    { id:9,  sender:"你",            content:"请问可以用第三方API吗？比如GPT-4之类的", time:"15:35", self:true },
    { id:10, sender:"大赛官助sasa",  content:"@你 可以用，但是优先推荐使用腾讯混元，决赛答辩时若展示项目使用混元大模型有加分项哦～", time:"15:36", self:false },
    { id:11, sender:"土豆片",        content:"我们队还差一个产品同学，有没有想加入的呀（产品方向）", time:"15:50", self:false },
    { id:12, sender:"幻想国",        content:"+1 我们也缺个产品", time:"15:52", self:false },
    { id:13, sender:"system",        content:"云上枫加入了群聊", time:"15:08", self:false, isSystem:true, date:"4月25日 周五" },
    { id:14, sender:"云上枫",        content:"大家好！请问这次比赛的评分维度有几个？", time:"15:10", self:false },
    { id:15, sender:"大赛官助sasa",  content:"评分维度共5个：用户洞察与问题定义（20%）、产品方案设计（30%）、AI原生能力说明（25%）、落地可行性（15%）、创新差异化（10%）", time:"15:12", self:false },
    { id:16, sender:"陈同学",        content:"请问可以个人参赛还是必须组队", time:"09:10", self:false, date:"今天" },
    { id:17, sender:"大赛官助小刘",  content:"鼓励1-3人组队，也支持1人参赛，不过多人团队更有优势哦", time:"09:15", self:false },
    { id:18, sender:"你",            content:"请问需要提交代码吗还是只要Demo就够了", time:"10:20", self:true },
    { id:19, sender:"大赛官助sasa",  content:"@你 Demo可以是视频演示、交互原型或可运行代码，形式不限，能展示产品核心功能即可", time:"10:22", self:false },
    { id:20, sender:"Lena_p",        content:"有没有做校园场景的同学，可以交流一下思路吗", time:"11:00", self:false },
    { id:21, sender:"你",            content:"@Lena_p 我也是做校园方向的，可以加个好友", time:"11:05", self:true },
    { id:22, sender:"system",        content:"Lena_p 请求添加你为好友", time:"11:06", self:false, isSystem:true },
  ],
  2: [
    { id:1,  sender:"翁一士",        content:"今天王闯这边会把图纸出了给到你们 @😇 @Monica 周六师妹们辛苦一下 把这周做的片子除膜除了", time:"09:32", self:false, date:"4月25日 周五" },
    { id:2,  sender:"Monica",        content:"收到", time:"09:35", self:false },
    { id:3,  sender:"😇",            content:"除完直接装板子寄吗", time:"09:40", self:false },
    { id:4,  sender:"翁一士",        content:"之前有寄过来那种塑料的大板子\n可以放那个里面寄", time:"09:42", self:false },
    { id:5,  sender:"😇",            content:"ok", time:"09:43", self:false },
    { id:6,  sender:"翁一士",        content:"然后让快递好好包装", time:"09:44", self:false },
    { id:7,  sender:"王闯",          content:"下周三16:30开一次组会，请要展示的同学做好准备", time:"10:15", self:false },
    { id:8,  sender:"MMMN",          content:"用大的没必要吧 小的好寄点 @Monica", time:"10:30", self:false },
    { id:9,  sender:"Monica",        content:"可以\n六目 去过黄了 字写在背面 没有问题我就寄了", time:"10:35", self:false },
    { id:10, sender:"王闯",          content:"OK 好的 辛苦了[强]\n寄了后 跟赵博说一声", time:"10:38", self:false },
    { id:11, sender:"翁一士",        content:"新生我记得之前教过一个人封过，可以找他试试。", time:"11:02", self:false },
    { id:12, sender:"哩哩（刘黎黎）",content:"好的", time:"11:05", self:false },
    { id:13, sender:"翁一士",        content:"@Yishi @王莉莉 @仲雪飞 三位老师好，五一期间，411/416有没有实验室要开展实验活动？学院要统计", time:"14:20", self:false, date:"4月27日 周日" },
    { id:14, sender:"你",            content:"xitai的片子是同一天做的吗？曝光是一个同学吗 @哩哩（刘黎黎）", time:"15:00", self:true },
    { id:15, sender:"哩哩（刘黎黎）",content:"不是同一天，有一半是一天做的，曝光是两个人，同一天仅一个人曝光", time:"15:08", self:false },
    { id:16, sender:"你",            content:"横向周期设计的多少，有测过吗？\n单片光栅有色散，这边测了入出横向周期差10nm", time:"15:15", self:true },
    { id:17, sender:"哩哩（刘黎黎）",content:"412nm的横向周期\n这边测过的", time:"15:20", self:false },
    { id:18, sender:"你",            content:"入和出横向周期为什么会差啊？", time:"15:22", self:true },
    { id:19, sender:"哩哩（刘黎黎）",content:"我也没想明白，有好有坏。另外下面的载具可以旋转0.5度，具体逆时针还是顺时针需要封一下看看。", time:"15:35", self:false },
    { id:20, sender:"翁一士",        content:"明日组会线上[旺柴][强]", time:"16:20", self:false, date:"今天" },
    { id:21, sender:"王闯",          content:"[旺柴][强]", time:"16:21", self:false },
    { id:22, sender:"MMMN",          content:"光阑是松的 动了光阑后 光斑位置变了\n。。。。。", time:"16:25", self:false },
    { id:23, sender:"翁一士",        content:"翁一士 邀请您参加腾讯会议\n📞 429组会\n🕐 2026/04/29 16:30-19:30\n截止前提交实验进度汇报", time:"16:32", self:false, atMe:true },
  ],
  3: [
    { id:1,  sender:"张师兄", content:"师弟最近实验咋样，出数据了吗", time:"09:00", self:false, date:"4月24日 周四" },
    { id:2,  sender:"你",     content:"还在跑数据，衍射效率这边有点低，不知道是不是曝光量的问题", time:"09:05", self:true },
    { id:3,  sender:"张师兄", content:"曝光量调多少了", time:"09:07", self:false },
    { id:4,  sender:"你",     content:"150mJ/cm² 按之前的参数来的", time:"09:08", self:true },
    { id:5,  sender:"张师兄", content:"试试提到180，我上次这个参数效果更好", time:"09:10", self:false },
    { id:6,  sender:"你",     content:"好的，今天下午试试，谢谢师兄！", time:"09:11", self:true },
    { id:7,  sender:"张师兄", content:"另外组会上翁老师说要讲彩色的进展，你那边彩色片子啥时候能出来", time:"14:30", self:false },
    { id:8,  sender:"你",     content:"下周三之前应该能做完，就是不知道效果好不好", time:"14:32", self:true },
    { id:9,  sender:"张师兄", content:"先做出来再说，不好再迭代嘛", time:"14:34", self:false },
    { id:10, sender:"你",     content:"嗯嗯，那组会要不要展示中间过程的数据", time:"14:35", self:true },
    { id:11, sender:"张师兄", content:"展示一下吧，翁老师喜欢看过程，不是只看结果", time:"14:36", self:false },
    { id:12, sender:"你",     content:"ok收到！", time:"14:37", self:true },
    { id:13, sender:"张师兄", content:"对了你用的是哪个型号的全息材料", time:"16:00", self:false, date:"今天" },
    { id:14, sender:"你",     content:"Bayfol HX 200，不是特别好但实验室就这个", time:"16:02", self:true },
    { id:15, sender:"张师兄", content:"在吗师弟，最近实验进展怎么样", time:"09:15", self:false },
    { id:16, sender:"你",     content:"在的师兄！上周做的两组样品已经测完，横向周期偏差有点大", time:"09:20", self:true },
    { id:17, sender:"张师兄", content:"偏差多少", time:"09:21", self:false },
    { id:18, sender:"你",     content:"10nm左右，比预期大", time:"09:22", self:true },
    { id:19, sender:"张师兄", content:"嗯，可能是曝光那边的问题，下次可以试试调一下载具角度", time:"09:30", self:false },
    { id:20, sender:"张师兄", content:"对了下午的图纸我整理一下，3点前发你", time:"14:10", self:false },
    { id:21, sender:"你",     content:"好嘞！师兄辛苦", time:"14:11", self:true },
    { id:22, sender:"张师兄", content:"图纸我下午发你", time:"15:42", self:false },
  ],
  4: [
    { id:1,  sender:"张老师",    content:"同学们晚上好，本周的课程内容是TCP/UDP协议详解，预习材料已上传至学习通", time:"20:15", self:false, date:"4月22日 周二" },
    { id:2,  sender:"王同学",    content:"老师，课件可以发PDF版的吗？PPT在我ipad上打不开", time:"20:30", self:false },
    { id:3,  sender:"张老师",    content:"好的，我转成PDF再上传一份", time:"20:35", self:false },
    { id:4,  sender:"助教 陈学长",content:"📌 第三章作业已发布：\n1. 完成课后习题3.1-3.8\n2. 编程题：实现简易TCP三次握手模拟\n3. 截止时间：5月9日 23:59\n4. 双平台提交：邮箱+学习通", time:"10:00", self:false, date:"4月25日 周五" },
    { id:5,  sender:"你",        content:"@助教 陈学长 请问编程题用Python还是C都可以吗", time:"10:30", self:true },
    { id:6,  sender:"助教 陈学长",content:"@你 都可以，附上简要的注释和运行截图就行", time:"10:32", self:false },
    { id:7,  sender:"李同学",    content:"请问DDL会延期吗，五一假期写不完啊😭", time:"11:00", self:false },
    { id:8,  sender:"助教 陈学长",content:"DDL不延期哦，五一前可以提前写", time:"11:05", self:false },
    { id:9,  sender:"赵同学",    content:"请问编程题要不要测试用例截图", time:"11:20", self:false },
    { id:10, sender:"助教 陈学长",content:"需要！要展示三次握手的完整过程输出", time:"11:22", self:false },
    { id:11, sender:"孙同学",    content:"作业字数统计包含代码吗", time:"11:40", self:false },
    { id:12, sender:"助教 陈学长",content:"不包含，3000字是正文", time:"11:42", self:false },
    { id:13, sender:"张老师",    content:"📢 重要通知：本周四（4月30日）下午的课调到 教三-204，时间不变下午14:00开始", time:"14:00", self:false, date:"4月28日 周一" },
    { id:14, sender:"陈同学",    content:"收到老师！", time:"14:02", self:false },
    { id:15, sender:"你",        content:"收到", time:"14:05", self:true },
    { id:16, sender:"王同学",    content:"老师教三-204在哪个楼", time:"14:10", self:false },
    { id:17, sender:"张老师",    content:"教学三号楼，和上次上课那栋一样，就是换了房间号", time:"14:12", self:false },
    { id:18, sender:"张老师",    content:"再次提醒：第三章课后作业本周五（5月9日）23:59前提交，word格式，不少于3000字，发到课程邮箱，并同步提交到学习通平台", time:"14:20", self:false, date:"今天" },
    { id:19, sender:"助教 陈学长",content:"补充：不接受补交，请大家务必提前完成", time:"14:22", self:false },
    { id:20, sender:"钱同学",    content:"老师，学习通是提交word还是pdf", time:"14:25", self:false },
    { id:21, sender:"张老师",    content:"@钱同学 word即可，不用再转pdf", time:"14:26", self:false },
    { id:22, sender:"周同学",    content:"感谢老师！", time:"14:27", self:false },
  ],
  5: [
    { id:1,  sender:"李老师",    content:"🌟 本周实验：实现红黑树的插入、删除与查找操作", time:"08:30", self:false, date:"4月21日 周一" },
    { id:2,  sender:"助教",      content:"[文件] 实验报告模板.docx", time:"08:32", self:false },
    { id:3,  sender:"刘同学",    content:"老师，红黑树的旋转操作可以画图说明吗？", time:"10:15", self:false },
    { id:4,  sender:"李老师",    content:"可以，建议使用draw.io或者手绘扫描", time:"10:20", self:false },
    { id:5,  sender:"你",        content:"实验DDL是哪天？", time:"11:00", self:true },
    { id:6,  sender:"助教",      content:"@你 5月15日24点", time:"11:05", self:false },
    { id:7,  sender:"黄同学",    content:"请问是要手写代码还是可以借助IDE", time:"11:30", self:false },
    { id:8,  sender:"助教",      content:"IDE可以用，但代码要自己写不能抄", time:"11:32", self:false },
    { id:9,  sender:"刘同学",    content:"C++还是Java写，或者都可以", time:"13:00", self:false },
    { id:10, sender:"李老师",    content:"不限语言，但要和报告说明一致", time:"13:05", self:false },
    { id:11, sender:"你",        content:"老师删除操作如果涉及双黑修复，需要写详细推导过程吗", time:"13:20", self:true },
    { id:12, sender:"李老师",    content:"@你 写关键步骤就行，不用全部列出来，结合代码注释即可", time:"13:22", self:false },
    { id:13, sender:"宋同学",    content:"复杂度分析必须写吗", time:"14:00", self:false },
    { id:14, sender:"助教",      content:"要写，时间复杂度和空间复杂度都要分析", time:"14:02", self:false },
    { id:15, sender:"吴同学",    content:"老师上课讲的那个AVL树代码可以复用吗", time:"15:00", self:false },
    { id:16, sender:"李老师",    content:"不行，这次是红黑树，需要独立实现", time:"15:02", self:false },
    { id:17, sender:"周同学",    content:"[图片]", time:"11:08", self:false, date:"今天" },
    { id:18, sender:"周同学",    content:"我画的红黑树插入流程图，有不对的地方请大佬们指正🤝", time:"11:09", self:false },
    { id:19, sender:"林同学",    content:"我觉得第3步应该先检查叔父节点颜色", time:"11:15", self:false },
    { id:20, sender:"周同学",    content:"你说得对！我改一下😭", time:"11:16", self:false },
    { id:21, sender:"你",        content:"谢谢大家，这图很有帮助", time:"11:18", self:true },
    { id:22, sender:"助教",      content:"补充：5月15日DDL是当天23:59，不是24点，大家注意", time:"14:00", self:false },
  ],
  6: [
    { id:1,  sender:"王教授",    content:"同学们好，本周课程重点：进程调度算法（FCFS、SJF、RR）",  time:"08:00", self:false, date:"4月21日 周一" },
    { id:2,  sender:"助教",      content:"实验2提交要求：\n• 实验报告（PDF）\n• 代码（zip打包）\n• 截图（关键步骤）", time:"08:30", self:false },
    { id:3,  sender:"叶同学",    content:"老师实验用Linux还是Windows环境", time:"10:00", self:false },
    { id:4,  sender:"助教",      content:"推荐Linux，在虚拟机里做就行", time:"10:02", self:false },
    { id:5,  sender:"你",        content:"实验2能用Python模拟吗还是要C语言", time:"10:10", self:true },
    { id:6,  sender:"助教",      content:"@你 Python可以，但要注意系统调用部分的模拟方式", time:"10:12", self:false },
    { id:7,  sender:"黄同学",    content:"实验报告有没有字数要求", time:"10:30", self:false },
    { id:8,  sender:"助教",      content:"没有强制字数，但思路分析要写清楚", time:"10:32", self:false },
    { id:9,  sender:"王教授",    content:"实验3报告模板已上传到课程网站，注意本次实验需要现场答辩", time:"16:20", self:false, date:"昨天" },
    { id:10, sender:"刘同学",    content:"答辩什么时候", time:"16:25", self:false },
    { id:11, sender:"助教",      content:"下周三（5月7日）下午14:00-17:00，机房405", time:"16:30", self:false },
    { id:12, sender:"你",        content:"好的", time:"16:32", self:true },
    { id:13, sender:"陈同学",    content:"答辩需要PPT吗", time:"16:40", self:false },
    { id:14, sender:"助教",      content:"要的，5分钟汇报+5分钟提问", time:"16:42", self:false },
    { id:15, sender:"唐同学",    content:"一个人答辩还是小组", time:"16:50", self:false },
    { id:16, sender:"助教",      content:"个人作业，个人答辩", time:"16:52", self:false },
    { id:17, sender:"邓同学",    content:"老师实验3那个内存分配的题我还没看懂，有没有参考资料", time:"20:00", self:false },
    { id:18, sender:"助教",      content:"OS三大内存分配算法：首次适配、最佳适配、最差适配，我发个链接", time:"20:10", self:false },
    { id:19, sender:"你",        content:"感谢助教！收藏了", time:"20:12", self:true },
    { id:20, sender:"张同学",    content:"提问，实验3跑出来内存碎片率很高正常吗", time:"20:30", self:false },
    { id:21, sender:"助教",      content:"这个正常的，主要看你的算法实现对不对", time:"20:32", self:false },
    { id:22, sender:"你",        content:"操作系统实验答辩5月7日机房405，我记一下", time:"20:35", self:true },
  ],
  7: [
    { id:1,  sender:"班长 李同学",content:"大家好，关于本学期末的班级毕业旅行，想先摸一下底，大概有多少人有意愿参加", time:"09:00", self:false, date:"4月24日 周四" },
    { id:2,  sender:"吴同学",    content:"我参加！去哪里呀", time:"09:05", self:false },
    { id:3,  sender:"你",        content:"我也感兴趣，时间定了吗", time:"09:07", self:true },
    { id:4,  sender:"班长 李同学",content:"还没定，先看看人数，30人以上才比较划算", time:"09:10", self:false },
    { id:5,  sender:"赵同学",    content:"1", time:"09:15", self:false },
    { id:6,  sender:"钱同学",    content:"2，去厦门吧", time:"09:16", self:false },
    { id:7,  sender:"孙同学",    content:"3，赞成厦门+1", time:"09:17", self:false },
    { id:8,  sender:"你",        content:"4", time:"09:18", self:true },
    { id:9,  sender:"周同学",    content:"5，票价有点贵但可以接受", time:"09:20", self:false },
    { id:10, sender:"郑同学",    content:"6，我本来就是厦门的哈哈哈，可以当导游", time:"09:21", self:false },
    { id:11, sender:"班长 李同学",content:"哈哈哈那太好了！我来整理一下名单", time:"09:22", self:false },
    { id:12, sender:"王同学",    content:"老师知道了吗，需要审批吗", time:"09:25", self:false },
    { id:13, sender:"班长 李同学",content:"这是同学自发活动，不需要审批，但会跟辅导员说一声", time:"09:27", self:false },
    { id:14, sender:"班长 李同学",content:"📢【班费收缴通知】\n各位同学，本学期班费每人150元，请于5月15日前转账到我的支付宝", time:"10:30", self:false, date:"今天" },
    { id:15, sender:"你",        content:"好的，下午就转", time:"10:35", self:true },
    { id:16, sender:"王同学",    content:"收到👌", time:"10:38", self:false },
    { id:17, sender:"陈同学",    content:"支付宝账号多少", time:"10:39", self:false },
    { id:18, sender:"班长 李同学",content:"发你私聊了", time:"10:40", self:false },
    { id:19, sender:"班长 李同学",content:"另外咱们班团建定在5月18日（周日），地点紫金山徒步+晚饭，去的同学接龙一下！", time:"10:45", self:false },
    { id:20, sender:"陈同学",    content:"1. 陈", time:"10:50", self:false },
    { id:21, sender:"吴同学",    content:"2. 吴，上次没去，这次一定去", time:"10:52", self:false },
    { id:22, sender:"林同学",    content:"3. 林", time:"10:53", self:false },
  ],
  8: [
    { id:1,  sender:"学院辅导员", content:"各位同学，毕业前的各项流程请认真对待，下面发一份时间节点汇总", time:"09:00", self:false, date:"4月20日 周日" },
    { id:2,  sender:"学院辅导员", content:"📅 毕业时间节点：\n• 5/1-5/10 档案核查\n• 5/10-5/20 论文初稿提交\n• 5/25-6/10 盲审\n• 6/15-6/18 答辩\n• 6/25 学位评定", time:"09:02", self:false },
    { id:3,  sender:"唐同学",     content:"请问学位服在哪里领", time:"09:30", self:false },
    { id:4,  sender:"学院辅导员", content:"6月10日之后统一在学院楼下领，会通知具体时间", time:"09:32", self:false },
    { id:5,  sender:"邓同学",     content:"如果盲审没过会怎样", time:"10:00", self:false },
    { id:6,  sender:"学院辅导员", content:"不合格需修改后重新送审，会影响答辩时间", time:"10:02", self:false },
    { id:7,  sender:"你",         content:"请问论文字数有没有下限", time:"10:10", self:true },
    { id:8,  sender:"学院辅导员", content:"@你 本科论文一般不少于1.5万字，研究生不少于3万字", time:"10:12", self:false },
    { id:9,  sender:"沈同学",     content:"导师评阅和盲审是同时进行吗", time:"11:00", self:false },
    { id:10, sender:"学院辅导员", content:"不是同时，导师先评再送盲审", time:"11:02", self:false },
    { id:11, sender:"韩同学",     content:"毕业典礼什么时候", time:"14:00", self:false },
    { id:12, sender:"学院辅导员", content:"暂定6月28日，具体日期以学校公告为准", time:"14:05", self:false },
    { id:13, sender:"教务老师",   content:"【毕业论文盲审说明】\n1. 初稿提交截止：5月20日\n2. 盲审：5月25日 - 6月10日\n3. 答辩：6月15-18日\n请按时提交，逾期视为放弃答辩资格", time:"16:00", self:false, date:"昨天" },
    { id:14, sender:"学院辅导员", content:"另外提醒下，毕业生离校手续清单已发到各班群，请尽早办理", time:"16:30", self:false },
    { id:15, sender:"冯同学",     content:"档案可以不回原籍吗", time:"17:00", self:false },
    { id:16, sender:"学院辅导员", content:"可以留在就业地，到就业单位的人事部门", time:"17:02", self:false },
    { id:17, sender:"你",         content:"档案不找工作就先挂在哪里", time:"17:05", self:true },
    { id:18, sender:"学院辅导员", content:"@你 可以挂在户籍所在地的人才交流中心，或学校提供的档案托管服务", time:"17:07", self:false },
    { id:19, sender:"卫同学",     content:"谢谢老师解答！", time:"17:10", self:false },
    { id:20, sender:"褚同学",     content:"请问答辩完还要等多久拿学位证", time:"18:00", self:false },
    { id:21, sender:"教务老师",   content:"答辩通过后约1-2个月，7月底前会发", time:"18:05", self:false },
    { id:22, sender:"季同学",     content:"收到！感谢老师们", time:"18:06", self:false },
  ],
  9: [
    { id:1,  sender:"队友 王",    content:"大家好，先确认一下分工，我负责市场调研和商业模式", time:"10:00", self:false, date:"4月24日 周四" },
    { id:2,  sender:"队友 周",    content:"我做技术方案和架构图", time:"10:05", self:false },
    { id:3,  sender:"你",         content:"我来做产品设计和PPT视觉", time:"10:07", self:true },
    { id:4,  sender:"队友 刘",    content:"我写用户调研和竞品分析", time:"10:09", self:false },
    { id:5,  sender:"队友 王",    content:"好！那周三晚上开个线上会对齐进度，怎么样", time:"10:10", self:false },
    { id:6,  sender:"你",         content:"没问题", time:"10:11", self:true },
    { id:7,  sender:"队友 周",    content:"我周三晚上有课，能不能改周四", time:"10:12", self:false },
    { id:8,  sender:"队友 王",    content:"没问题，周四晚8点，腾讯会议", time:"10:13", self:false },
    { id:9,  sender:"队友 刘",    content:"我发现一个竞品做得不错，等会截图发群里参考下", time:"11:30", self:false },
    { id:10, sender:"队友 刘",    content:"[图片] 竞品界面截图", time:"11:31", self:false },
    { id:11, sender:"你",         content:"他家这个排版不错，可以参考风格", time:"11:35", self:true },
    { id:12, sender:"队友 王",    content:"对对对，但我们差异化要体现出来，不要做得一样", time:"11:37", self:false },
    { id:13, sender:"你",         content:"我把PPT v3发群里了，大家看看", time:"11:20", self:true, date:"今天" },
    { id:14, sender:"你",         content:"[文件] Team Phoenix_产品方案_v3.pptx", time:"11:21", self:true },
    { id:15, sender:"队友 王",    content:"我看了，第8页商业模式那块有点单薄", time:"11:35", self:false },
    { id:16, sender:"队友 刘",    content:"+1 还有用户画像可以再具体点", time:"11:40", self:false },
    { id:17, sender:"你",         content:"好，我再补充一下，今晚改完发新版", time:"11:45", self:true },
    { id:18, sender:"队友 周",    content:"⏰ 初赛截止5月6日23:59，下周一前要把所有材料定稿！", time:"13:00", self:false },
    { id:19, sender:"队友 周",    content:"@全体成员 还剩 5 天，加油冲！", time:"13:01", self:false, atMe:true },
    { id:20, sender:"你",         content:"收到，加油！", time:"13:22", self:true },
    { id:21, sender:"队友 王",    content:"加油！我今晚把商业模式那页补充好发给你", time:"13:25", self:false },
    { id:22, sender:"队友 刘",    content:"用户调研数据我再多找几个样本，周五发给你", time:"13:28", self:false },
  ],
  10: [
    { id:1,  sender:"刘正昂",    content:"哥们，今天组会的PPT你更新了吗", time:"09:00", self:false, date:"4月24日 周四" },
    { id:2,  sender:"你",        content:"更新了，把第五页数据改了一下，你看看", time:"09:05", self:true },
    { id:3,  sender:"刘正昂",    content:"ok，我加了几个用户调研数据进去，你待会合并一下", time:"09:10", self:false },
    { id:4,  sender:"你",        content:"行，你发给我", time:"09:11", self:true },
    { id:5,  sender:"刘正昂",    content:"[文件] 用户调研补充数据.xlsx", time:"09:12", self:false },
    { id:6,  sender:"你",        content:"收到！", time:"09:13", self:true },
    { id:7,  sender:"刘正昂",    content:"商业模式那页你觉得怎么改比较好", time:"14:00", self:false },
    { id:8,  sender:"你",        content:"我觉得可以加个盈利预测的数字，显得更有说服力", time:"14:03", self:true },
    { id:9,  sender:"刘正昂",    content:"对，但数字怎么估算，感觉不太好写", time:"14:05", self:false },
    { id:10, sender:"你",        content:"可以参考同类产品的数据，先做个保守估计", time:"14:07", self:true },
    { id:11, sender:"刘正昂",    content:"ok我来找数据，你先改视觉那块", time:"14:09", self:false },
    { id:12, sender:"你",        content:"没问题，我今晚改好发你", time:"14:10", self:true },
    { id:13, sender:"刘正昂",    content:"兄弟在不", time:"23:30", self:false, date:"昨天" },
    { id:14, sender:"刘正昂",    content:"PPT那个用户调研图我加了几个数据", time:"23:35", self:false },
    { id:15, sender:"刘正昂",    content:"[图片]", time:"01:48", self:false },
    { id:16, sender:"你",        content:"明天看，先睡了😪", time:"06:50", self:true, date:"今天" },
    { id:17, sender:"刘正昂",    content:"哈哈哈好，我也刚睡", time:"07:00", self:false },
    { id:18, sender:"你",        content:"你昨晚干到几点的", time:"08:30", self:true },
    { id:19, sender:"刘正昂",    content:"2点多，商业模式写得有点上头", time:"08:35", self:false },
    { id:20, sender:"你",        content:"注意身体啊，这两天别熬太狠，后面还要准备答辩", time:"08:36", self:true },
    { id:21, sender:"刘正昂",    content:"好的，今晚早点睡，你那边v4啥时候出", time:"09:00", self:false },
    { id:22, sender:"你",        content:"争取今天下午，你先把你的部分发我", time:"09:02", self:true },
  ],
  11: [
    { id:1,  sender:"社长小明",   content:"大家好！本学期第一次外拍活动定在下周六，报名的同学接龙", time:"20:00", self:false, date:"4月20日 周日" },
    { id:2,  sender:"社员小张",   content:"1. 张", time:"20:05", self:false },
    { id:3,  sender:"社员小红",   content:"2. 红", time:"20:06", self:false },
    { id:4,  sender:"你",         content:"3. 我", time:"20:07", self:true },
    { id:5,  sender:"社员小林",   content:"4. 林，期待！", time:"20:08", self:false },
    { id:6,  sender:"社长小明",   content:"好的，已经有8个人报名，初定玄武湖，记得带长焦", time:"20:10", self:false },
    { id:7,  sender:"社员小张",   content:"要带三脚架吗", time:"20:12", self:false },
    { id:8,  sender:"社长小明",   content:"看个人，不是必须的，机动摄影更多一些", time:"20:14", self:false },
    { id:9,  sender:"你",         content:"集合时间和地点定了吗", time:"20:15", self:true },
    { id:10, sender:"社长小明",   content:"@你 下午2点，玄武湖公园正门集合", time:"20:16", self:false },
    { id:11, sender:"你",         content:"收到👍", time:"20:17", self:true },
    { id:12, sender:"社长小明",   content:"周六外拍活动改到下午3点，地点不变还是玄武湖", time:"15:20", self:false, date:"昨天" },
    { id:13, sender:"你",         content:"收到！", time:"15:22", self:true },
    { id:14, sender:"社员小林",   content:"为什么推迟了", time:"15:24", self:false },
    { id:15, sender:"社长小明",   content:"有个成员上午有课，整体推迟一小时", time:"15:26", self:false },
    { id:16, sender:"社长小明",   content:"对了，周六外拍地点也改了，改到情人谷，人少一点风景好。集合：地铁2号线下马坊站A出口 14:30", time:"19:45", self:false },
    { id:17, sender:"社员小张",   content:"👍", time:"19:46", self:false },
    { id:18, sender:"你",         content:"好的", time:"19:50", self:true },
    { id:19, sender:"社员小红",   content:"情人谷在哪，我没去过", time:"19:52", self:false },
    { id:20, sender:"社长小明",   content:"就在东郊，离市区不远，很出片！", time:"19:54", self:false },
    { id:21, sender:"社员小张",   content:"上次拍的照片有没有人出修图版，我的手机直出不太行", time:"20:00", self:false },
    { id:22, sender:"你",         content:"我晚点修几张发你们", time:"20:02", self:true },
  ],
  12: [
    { id:1,  sender:"宣传部长",   content:"各位，五月份咱们部门有三场活动，今天先开个预备会", time:"09:00", self:false, date:"4月20日 周日" },
    { id:2,  sender:"宣传部长",   content:"三场活动：\n• 5/10 校园歌手大赛\n• 5/18 创新创业讲座\n• 5/25 毕业生晚会\n每场至少需要2人负责宣传物料和现场记录", time:"09:02", self:false },
    { id:3,  sender:"陆同学",     content:"我可以认领5/10校园歌手", time:"09:10", self:false },
    { id:4,  sender:"伍同学",     content:"我认领5/25毕业晚会", time:"09:11", self:false },
    { id:5,  sender:"你",         content:"我可以协助5/18讲座", time:"09:12", self:true },
    { id:6,  sender:"宣传部长",   content:"很好，5/18讲座还差一个人，@你 你找个搭档一起", time:"09:14", self:false },
    { id:7,  sender:"钱同学",     content:"我和他搭档", time:"09:15", self:false },
    { id:8,  sender:"宣传部长",   content:"好！分工：宣传海报提前1周出，当天负责摄影+推文", time:"09:17", self:false },
    { id:9,  sender:"你",         content:"海报我来做，摄影钱同学负责？", time:"09:18", self:true },
    { id:10, sender:"钱同学",     content:"可以，我来", time:"09:19", self:false },
    { id:11, sender:"宣传部长",   content:"那就定了，各自的任务写进飞书，方便后续追踪进度", time:"09:21", self:false },
    { id:12, sender:"陆同学",     content:"5/10校园歌手的主视觉风格有要求吗", time:"10:00", self:false },
    { id:13, sender:"宣传部长",   content:'今年主题是"星光舞台"，视觉走黑金风格，之前的VI规范在群文件里', time:"10:03", self:false },
    { id:14, sender:"宣传部长",   content:"[文件] 5月活动排期.xlsx", time:"10:00", self:false, date:"周一" },
    { id:15, sender:"宣传部长",   content:"5月有3场活动需要宣传组的同学认领，大家自愿，发我私聊", time:"10:05", self:false },
    { id:16, sender:"伍同学",     content:"收到！", time:"10:08", self:false },
    { id:17, sender:"你",         content:"好的，我私聊你确认一下", time:"10:09", self:true },
    { id:18, sender:"邬同学",     content:"毕业晚会场地定了吗，去年在礼堂", time:"10:15", self:false },
    { id:19, sender:"宣传部长",   content:"还在申请，应该也是礼堂，等确认通知", time:"10:17", self:false },
    { id:20, sender:"翟同学",     content:"讲座的嘉宾有没有确定", time:"10:30", self:false },
    { id:21, sender:"宣传部长",   content:"请到了一位创业公司CEO，具体信息下周公布", time:"10:32", self:false },
    { id:22, sender:"你",         content:"期待！", time:"10:33", self:true },
  ],
  13: [
    { id:1,  sender:"小美",       content:"在吗在吗！下周末有空不", time:"10:00", self:false, date:"4月26日 周六" },
    { id:2,  sender:"你",         content:"在！干啥", time:"10:05", self:true },
    { id:3,  sender:"小美",       content:"组个出游呀，叫上小红，我们三个好久没出来玩了", time:"10:08", self:false },
    { id:4,  sender:"你",         content:"好啊好啊，去哪？", time:"10:10", self:true },
    { id:5,  sender:"小美",       content:"我也没想好，玄武湖？中山陵？", time:"10:12", self:false },
    { id:6,  sender:"你",         content:"中山陵吧，没去过", time:"10:15", self:true },
    { id:7,  sender:"小美",       content:"行！我问下小红", time:"10:18", self:false },
    { id:8,  sender:"小美",       content:"小红说可以，你订好地铁时间发我", time:"10:30", self:false },
    { id:9,  sender:"你",         content:"好的，下午坐到哪站，你查一下", time:"10:32", self:true },
    { id:10, sender:"小美",       content:"地铁2号线中山陵站下，走路15分钟，建议2点前出发", time:"10:35", self:false },
    { id:11, sender:"你",         content:"那我们12:30左右出发？", time:"10:37", self:true },
    { id:12, sender:"小美",       content:"我12点才下课，12:30出发太紧了", time:"10:39", self:false },
    { id:13, sender:"你",         content:"那1点出发，2点到景区门口", time:"10:40", self:true },
    { id:14, sender:"小美",       content:"好！就这么定了，我跟小红说", time:"10:41", self:false },
    { id:15, sender:"小美",       content:"周末出游定了吗？我周六下午有空", time:"11:30", self:false, date:"今天" },
    { id:16, sender:"小红",       content:"我周六上午有课，下午可以", time:"11:32", self:false },
    { id:17, sender:"你",         content:"那就周六下午？去哪？", time:"11:33", self:true },
    { id:18, sender:"小美",       content:"不是说好中山陵了吗哈哈哈", time:"11:35", self:false },
    { id:19, sender:"你",         content:"对对对忘了😅", time:"11:36", self:true },
    { id:20, sender:"你",         content:"下午2点地铁站集合？", time:"11:37", self:true },
    { id:21, sender:"小美",       content:"👍 中山陵下午2点见", time:"11:38", self:false },
    { id:22, sender:"小红",       content:"好的", time:"11:38", self:false },
  ],
  14: [
    { id:1,  sender:"班长 李同学",content:"兄弟，毕业旅行你报名了吗", time:"09:00", self:false, date:"4月24日 周四" },
    { id:2,  sender:"你",         content:"报了！在群里接龙了", time:"09:05", self:true },
    { id:3,  sender:"班长 李同学",content:"ok好，可能去厦门，大概6月底，你有没有时间", time:"09:07", self:false },
    { id:4,  sender:"你",         content:"答辩完了应该就可以，大概6月底", time:"09:09", self:true },
    { id:5,  sender:"班长 李同学",content:"好，那毕业典礼之后出发，6月28-7月1，4天3夜", time:"09:11", self:false },
    { id:6,  sender:"你",         content:"可以，我标注一下", time:"09:12", self:true },
    { id:7,  sender:"班长 李同学",content:"另外咱们班有没有同学会摄影的，毕业旅行想留下好一点的照片", time:"09:20", self:false },
    { id:8,  sender:"你",         content:"我在摄影社，会一点，可以帮忙拍", time:"09:22", self:true },
    { id:9,  sender:"班长 李同学",content:"太好了！那就靠你了！带上你的相机哈哈哈", time:"09:23", self:false },
    { id:10, sender:"你",         content:"没问题！", time:"09:24", self:true },
    { id:11, sender:"班长 李同学",content:"哦对，你是摄影社的，这次社团外拍你去吗", time:"09:25", self:false },
    { id:12, sender:"你",         content:"去的，周六下午去情人谷", time:"09:26", self:true },
    { id:13, sender:"班长 李同学",content:"哦哈哈，你比我还忙", time:"09:27", self:false },
    { id:14, sender:"班长 李同学",content:"兄弟，班费150记得交一下", time:"10:50", self:false, date:"今天" },
    { id:15, sender:"班长 李同学",content:"另外团建你去吗？要的话给你登记一下", time:"10:51", self:false },
    { id:16, sender:"你",         content:"班费今天转！团建我去", time:"10:55", self:true },
    { id:17, sender:"班长 李同学",content:"收到，帮你登记了", time:"10:56", self:false },
    { id:18, sender:"你",         content:"谢谢！紫金山是全天活动还是半天", time:"10:57", self:true },
    { id:19, sender:"班长 李同学",content:"全天，上午爬山下午休息，晚上集体吃饭，穿舒服的鞋", time:"10:58", self:false },
    { id:20, sender:"你",         content:"明白！", time:"10:59", self:true },
    { id:21, sender:"班长 李同学",content:"另外下周一早上有个辅导员要求的班会，9点，记得来", time:"11:00", self:false },
    { id:22, sender:"你",         content:"好的，我记下来了", time:"11:01", self:true },
  ],
  15: [
    { id:1,  sender:"妈妈",        content:"孩子在忙什么呢", time:"10:00", self:false, date:"4月22日 周二" },
    { id:2,  sender:"你",          content:"在写作业，最近有点多", time:"10:05", self:true },
    { id:3,  sender:"妈妈",        content:"注意休息，别熬太晚", time:"10:07", self:false },
    { id:4,  sender:"你",          content:"知道了妈，你们在家都好吧", time:"10:08", self:true },
    { id:5,  sender:"妈妈",        content:"好好的，你爸前天去钓鱼了，钓了好多，让我冻起来等你回来吃", time:"10:09", self:false },
    { id:6,  sender:"你",          content:"哈哈好，那我放假回去", time:"10:10", self:true },
    { id:7,  sender:"妈妈",        content:"五一假期回来吗", time:"10:11", self:false },
    { id:8,  sender:"你",          content:"五一可能回不去，有个比赛要准备，六月毕业前回", time:"10:13", self:true },
    { id:9,  sender:"妈妈",        content:"哦那算了，好好备赛，妈不急", time:"10:15", self:false },
    { id:10, sender:"你",          content:"嗯嗯，妈你最好了", time:"10:16", self:true },
    { id:11, sender:"妈妈",        content:"哈哈，馋我红烧肉了吧", time:"10:17", self:false },
    { id:12, sender:"你",          content:"想！馋了😂", time:"10:18", self:true },
    { id:13, sender:"妈妈",        content:"孩子，妈给你寄了点家里的腊肉，明后天到", time:"18:30", self:false, date:"昨天" },
    { id:14, sender:"你",          content:"好嘞！谢谢妈", time:"18:35", self:true },
    { id:15, sender:"妈妈",        content:"记得吃饭啊孩子，别老吃外卖", time:"21:00", self:false },
    { id:16, sender:"你",          content:"妈我吃的，你放心", time:"21:05", self:true },
    { id:17, sender:"妈妈",        content:"今天吃什么了", time:"21:06", self:false },
    { id:18, sender:"你",          content:"下午食堂吃的黄焖鸡，挺好的", time:"21:08", self:true },
    { id:19, sender:"妈妈",        content:"那不错，多吃蔬菜", time:"21:09", self:false },
    { id:20, sender:"你",          content:"嗯嗯！妈你早点睡", time:"21:10", self:true },
    { id:21, sender:"妈妈",        content:"好，你也早点睡，明天还有课", time:"21:11", self:false },
    { id:22, sender:"你",          content:"好的妈，晚安！", time:"21:12", self:true },
  ],
  16: [
    { id:1,  sender:"宿舍老二",    content:"今天谁去图书馆的", time:"08:00", self:false, date:"4月26日 周六" },
    { id:2,  sender:"宿舍老三",    content:"没有，我摸鱼一天", time:"08:05", self:false },
    { id:3,  sender:"你",          content:"我本来要去，起晚了", time:"08:06", self:true },
    { id:4,  sender:"宿舍老四",    content:"我说今天去，结果在床上刷了三个小时B站", time:"08:08", self:false },
    { id:5,  sender:"宿舍老二",    content:"哈哈哈这就是当代大学生", time:"08:09", self:false },
    { id:6,  sender:"你",          content:"哎对了，毕业论文写了多少", time:"10:00", self:true },
    { id:7,  sender:"宿舍老三",    content:"3000字，离1.5万字还差一个小目标", time:"10:02", self:false },
    { id:8,  sender:"宿舍老四",    content:"我已经写完了……字数", time:"10:03", self:false },
    { id:9,  sender:"宿舍老三",    content:"你是神吗", time:"10:04", self:false },
    { id:10, sender:"宿舍老四",    content:"我是指凑字数凑完了，内容……还差得远", time:"10:05", self:false },
    { id:11, sender:"你",          content:"哈哈哈哈哈我也是凑字数高手", time:"10:06", self:true },
    { id:12, sender:"宿舍老二",    content:"导师今天催进度吗", time:"14:00", self:false },
    { id:13, sender:"宿舍老三",    content:"又催了，说再不交初稿就要找我谈话", time:"14:02", self:false },
    { id:14, sender:"你",          content:"我导师比较佛系，但五月底要交，我有点慌", time:"14:04", self:true },
    { id:15, sender:"宿舍老四",    content:"五月底！你还有时间哈", time:"14:05", self:false },
    { id:16, sender:"宿舍老二",    content:"今天又没去图书馆", time:"15:20", self:false, date:"昨天" },
    { id:17, sender:"宿舍老三",    content:"我也是，论文一个字没写", time:"15:22", self:false },
    { id:18, sender:"你",          content:"看了一天b站😇", time:"15:30", self:true },
    { id:19, sender:"宿舍老四",    content:"我起码出门买了杯奶茶，算是有点收获", time:"15:32", self:false },
    { id:20, sender:"宿舍老二",    content:"哈哈哈哈哈哈这是什么收获", time:"15:33", self:false },
    { id:21, sender:"你",          content:"奶茶喝的什么，我也想去买", time:"15:34", self:true },
    { id:22, sender:"宿舍老四",    content:"喜茶那边，生打椰椰拿铁，强烈推荐", time:"15:35", self:false },
  ],
  17: [
    { id:1,  sender:"活动部小张",  content:"大家好，5月志愿活动安排出来了，一共有3次", time:"10:00", self:false, date:"4月20日 周日" },
    { id:2,  sender:"活动部小张",  content:"📅 5月志愿排期：\n• 5/12 图书馆整理 8:00-12:00\n• 5/19 校园清洁 14:00-17:00\n• 5/26 毕业典礼引导 8:00-18:00", time:"10:02", self:false },
    { id:3,  sender:"志愿者小李",  content:"5/26毕业典礼我可以参加！", time:"10:10", self:false },
    { id:4,  sender:"你",          content:"我报名5/12图书馆整理", time:"10:12", self:true },
    { id:5,  sender:"志愿者小王",  content:"我三个都报！", time:"10:13", self:false },
    { id:6,  sender:"活动部小张",  content:"太好了！每次活动都有志愿时长证明", time:"10:15", self:false },
    { id:7,  sender:"志愿者小赵",  content:"志愿时长多少小时每次", time:"10:17", self:false },
    { id:8,  sender:"活动部小张",  content:"图书馆4小时，清洁3小时，毕业典礼8小时", time:"10:18", self:false },
    { id:9,  sender:"你",          content:"服装要求有吗", time:"10:20", self:true },
    { id:10, sender:"活动部小张",  content:"@你 穿校服或白色T恤+深色裤子就好", time:"10:21", self:false },
    { id:11, sender:"志愿者小李",  content:"毕业典礼那次需要提前培训吗", time:"10:25", self:false },
    { id:12, sender:"活动部小张",  content:"会的，5/24会有一次简短的培训，半小时左右", time:"10:26", self:false },
    { id:13, sender:"志愿者小王",  content:"我5/12有课，可以换到下午吗", time:"10:30", self:false },
    { id:14, sender:"活动部小张",  content:"可以，联系我私聊调换", time:"10:31", self:false },
    { id:15, sender:"活动部小张",  content:"5/12志愿排班已出，请大家在群文件查看", time:"14:00", self:false, date:"周日" },
    { id:16, sender:"你",          content:"收到", time:"14:30", self:true },
    { id:17, sender:"志愿者小赵",  content:"我在第二组对吗", time:"14:35", self:false },
    { id:18, sender:"活动部小张",  content:"对，二组8:30在图书馆门口集合", time:"14:37", self:false },
    { id:19, sender:"你",          content:"我在第几组", time:"14:40", self:true },
    { id:20, sender:"活动部小张",  content:"@你 你在第一组，8:00集合", time:"14:42", self:false },
    { id:21, sender:"你",          content:"ok！收到", time:"14:43", self:true },
    { id:22, sender:"志愿者小李",  content:"期待！一起加油💪", time:"14:44", self:false },
  ],
};

// ────────────────────────────────────────────────────────────
//  日程（初始数据，含多日）
// ────────────────────────────────────────────────────────────
const TODAY = "2026-04-29";

const INITIAL_SCHEDULE: ScheduleEvent[] = [
  { id:1,  date:"2026-04-29", startTime:"10:10", endTime:"11:00", title:"国家安全学",       location:"逸C-114",  type:"class",  color:"#E3F2FD", priority:"medium" },
  { id:2,  date:"2026-04-29", startTime:"18:30", endTime:"20:20", title:"中国近现代史纲要", location:"逸B-302",  type:"class",  color:"#E1F5FE", priority:"medium" },
  { id:3,  date:"2026-04-30", startTime:"14:00", endTime:"16:00", title:"计网课（教三-204）",location:"教三-204", type:"class",  color:"#E3F2FD", priority:"medium" },
  { id:4,  date:"2026-05-02", startTime:"10:00", endTime:"12:00", title:"数据结构实验课",   location:"机房302",  type:"class",  color:"#E8F5E9", priority:"medium" },
  { id:5,  date:"2026-05-06", startTime:"23:00", endTime:"23:59", title:"🔥 创新赛初赛截止", type:"task",  color:"#FFF1F0", priority:"high" },
  { id:6,  date:"2026-05-07", startTime:"14:00", endTime:"17:00", title:"操作系统实验3答辩", location:"机房405",  type:"exam",  color:"#FFF0F6", priority:"high" },
  { id:7,  date:"2026-05-09", startTime:"23:00", endTime:"23:59", title:"📎 计网作业截止",   type:"task",  color:"#FFE7BA", priority:"high" },
  { id:8,  date:"2026-05-10", startTime:"23:59", endTime:"23:59", title:"PCG报名截止",       type:"task",  color:"#FFF1F0", priority:"medium" },
  { id:9,  date:"2026-05-12", startTime:"08:00", endTime:"12:00", title:"志愿服务·图书馆",   location:"图书馆",   type:"event", color:"#F0FFF4", priority:"low" },
  { id:10, date:"2026-05-15", startTime:"23:59", endTime:"23:59", title:"数据结构实验DDL",   type:"task",  color:"#FFE7BA", priority:"high" },
];

// ────────────────────────────────────────────────────────────
//  重要度样式系统（替换原 CAPSULE_STYLES）
// ────────────────────────────────────────────────────────────
const IMP: Record<Priority, { bg: string; border: string; badge: string; dot: string; emoji: string; label: string; }> = {
  high:   { bg:"#FFF1F0", border:"#FF7875", badge:"#FF4D4F", dot:"#FF4D4F", emoji:"🔴", label:"紧急" },
  medium: { bg:"#FFF7E6", border:"#FFB340", badge:"#FA8C16", dot:"#FA8C16", emoji:"🟠", label:"重要" },
  low:    { bg:"#FFFBE6", border:"#FFD666", badge:"#FAAD14", dot:"#FAAD14", emoji:"🟡", label:"一般" },
};

const TYPE_STYLES: Record<string, { bg: string; border: string; badge: string; dot: string; emoji: string; label: string; }> = {
  confirmed: { bg:"#F6FFED", border:"#95DE64", badge:"#52C41A", dot:"#52C41A", emoji:"🟢", label:"已确认" },
  plan:      { bg:"#EFF6FF", border:"#93C5FD", badge:"#3B82F6", dot:"#3B82F6", emoji:"🔵", label:"方案参考" },
  sensitive: { bg:"#F5F5F5", border:"#D9D9D9", badge:"#8C8C8C", dot:"#8C8C8C", emoji:"⚫", label:"敏感信息" },
};

const getCapsuleStyle = (cap: Capsule) => {
  if (cap.type === "confirmed") return TYPE_STYLES.confirmed;
  if (cap.type === "plan")      return TYPE_STYLES.plan;
  if (cap.type === "sensitive") return TYPE_STYLES.sensitive;
  if (cap.type === "conflict")  return IMP.high;
  return IMP[cap.importance] || IMP.medium;
};

const getPriorityColor = (p?: Priority) => p === "high" ? "#FF4D4F" : p === "medium" ? "#FA8C16" : "#52C41A";

// ────────────────────────────────────────────────────────────
//  初始胶囊（含 importance 字段）
// ────────────────────────────────────────────────────────────
const INITIAL_CAPSULES: Capsule[] = [
  { id:101, type:"pending",  importance:"medium", group:"计算机网络 · 课程群", title:"📎 第三章作业 DDL",   content:"5月9日 23:59 前提交\nWord格式，不少于3000字\n邮箱+学习通双平台",                 time:"14:20", from:"张老师",    new:true, createdAt:"2026-04-29", scheduleData:{ date:"2026-05-09", startTime:"23:00", endTime:"23:59", title:"📎 计网作业截止", type:"task", color:"#FFE7BA", priority:"high" } },
  { id:102, type:"pending",  importance:"medium", group:"计网课程群",           title:"📍 周四课地点变更",   content:"4月30日 14:00 → 教三-204\n时间不变",                                            time:"14:00", from:"张老师",    new:true, createdAt:"2026-04-29", scheduleData:{ date:"2026-04-30", startTime:"14:00", endTime:"16:00", title:"🔄 计网课（教三-204）", type:"class", color:"#E6F7FF", priority:"medium" } },
  { id:103, type:"conflict", importance:"high",   group:"摄影社 × 课题组",     title:"⚠️ 周日下午时间冲突", content:"周日14:30 摄影外拍（情人谷集合）\n周日15:00 课题组小会议\n两者不可兼得，请尽快选择", time:"16:32", from:"AI 检测",   new:true, createdAt:"2026-04-29" },
  { id:104, type:"plan",     importance:"low",    group:"小美 💕",              title:"🗺️ 周末出游已确定",  content:"✅ 周六 14:00 中山陵地铁站集合\n👥 小美、小红、你",                               time:"11:38", from:"AI 总结",   new:false,createdAt:"2026-04-29", scheduleData:{ date:"2026-05-02", startTime:"14:00", endTime:"18:00", title:"🌸 中山陵出游", type:"event", color:"#FCE4EC", priority:"low" } },
  { id:105, type:"pending",  importance:"high",   group:"Team Phoenix",        title:"🔥 初赛截止 5/6",    content:"PPT + Demo视频 + 申报书\n建议5/5前定稿留出buffer\n⏰ 还剩5天！",                   time:"13:01", from:"队友 周",   new:true, createdAt:"2026-04-29", scheduleData:{ date:"2026-05-06", startTime:"23:00", endTime:"23:59", title:"🔥 创新赛初赛截止", type:"task", color:"#FFF1F0", priority:"high" } },
  { id:106, type:"pending",  importance:"high",   group:"王老师课题组",         title:"🔬 今日组会 16:30",  content:"4月29日 16:30-19:30\n腾讯会议线上",                                              time:"16:32", from:"翁一士",    new:true, createdAt:"2026-04-29", scheduleData:{ date:"2026-04-29", startTime:"16:30", endTime:"19:30", title:"🔬 课题组组会(线上)", type:"event", color:"#F9F0FF", priority:"high" } },
];

// ────────────────────────────────────────────────────────────
//  AI 回复（本地模拟）
// ────────────────────────────────────────────────────────────
const AI_SUMMARIES: Record<number, string> = {
  1: "📋 **对话总结（PCG大赛群）**\n\n• 大赛提交：PPT（≤20页）+ Demo视频（≤5分钟）\n• API：可用第三方，但使用混元有加分\n• 报名截止：5月10日，初赛提交：5月20日\n\n📌 **待办**\n1. 报名截止 5月10日\n2. Demo视频准备\n3. 考虑是否接入混元\n\n💡 还有什么想了解的？",
  2: "📋 **对话总结（课题组）**\n\n• 今日重点：16:30 腾讯会议组会（429组会）\n• 实验进展：横向周期偏差10nm，载具旋转调整中\n• 样品处理：师妹们周六除膜后寄到江西\n\n📌 **待办**\n1. ⚡ 今天16:30参加腾讯会议\n2. 整理彩色样品进展，准备汇报\n\n💡 还有什么想了解的？",
  4: "📋 **对话总结（计网群）**\n\n• ⚡ 第三章作业DDL：5月9日23:59\n• 作业：Word格式，3000字，学习通+邮箱双提交\n• 地点变更：4月30日课改到教三-204，14:00不变\n\n📌 **紧急待办**\n1. ⚡ 计网作业（还有10天）\n2. 周四注意换教室：教三-204\n\n💡 还有什么想了解的？",
  9: "📋 **对话总结（Team Phoenix）**\n\n• 截止：5月6日23:59，还剩5天\n• v3有问题：商业模式单薄、用户画像不具体\n• 分工：你(PPT)、王(商业)、刘(调研)、周(技术)\n\n📌 **紧急待办**\n1. 今晚出PPT v4\n2. 等队友素材（周五截止）\n\n💡 还有什么想了解的？",
  13: "📋 **对话总结（小美）**\n\n• ✅ 周六（5月2日）14:00 中山陵集合\n• 参与：你、小美、小红 三人均已确认\n• 地铁2号线中山陵站下，走路15分钟\n\n📌 **行动建议**\n1. 提前在「钟山风景名胜区」公众号实名预约\n2. 穿平底鞋，带充电宝\n\n💡 想了解中山陵游玩攻略？直接问我！",
};

function getAIFollowup(question: string, chatId: number): string {
  const q = question.toLowerCase();
  if (q.includes("中山陵") || q.includes("游玩") || q.includes("景点") || q.includes("推荐") || q.includes("攻略")) {
    return `🗺️ **中山陵游玩攻略**\n\n**主要景点（建议顺序）：**\n1. 🏛️ 博爱坊 → 陵门 → 碑亭（20min）\n2. 🪜 石阶长廊 — 台阶392步（20min）\n3. ⛩️ 祭堂 — 中山先生坐像（20min）\n4. 🌸 梅花山 — 园内赏花（30min）\n\n**实用提示：**\n• 门票免费，需提前在公众号实名预约\n• 穿平底鞋！石阶很多\n• 带充电宝，上山信号较差\n• 最佳拍照时间：下午4点后光线最好\n\n**预计2-3小时，16:30可以出来觅食 🍜**`;
  }
  if (q.includes("吃") || q.includes("美食") || q.includes("饭")) {
    return `🍜 **中山陵周边美食**\n\n• 鸭血粉丝汤 — 南京特色，出景区就有，人均15\n• 淮扬菜 — 中山路上多家，人均50-80\n• 推荐路线：游完（约17:00）→ 坐地铁到夫子庙 → 吃晚饭 → 秦淮河夜景 🏮`;
  }
  if (q.includes("预约") || q.includes("门票") || q.includes("收费")) {
    return `🎫 **中山陵预约说明**\n\n• 景区免费开放，但需实名预约\n• 微信搜索「钟山风景名胜区」公众号 → 预约入口\n• 周末限流，建议提前1-2天预约\n• 你们3人需各自预约，记得提醒小美和小红！`;
  }
  if (q.includes("ddl") || q.includes("截止") || q.includes("作业") || q.includes("待办")) {
    return `⏰ **近期DDL汇总**\n\n🔴 **紧急（5天内）：**\n• 创新创业大赛初赛 → 5月6日 23:59\n\n🟠 **重要（10天内）：**\n• 计网第三章作业 → 5月9日 23:59\n\n🟡 **待关注：**\n• 数据结构实验 → 5月15日\n• 操作系统实验3答辩 → 5月7日 14:00\n\n📌 **建议今晚先搞定PPT v4！**`;
  }
  if (q.includes("组会") || q.includes("汇报")) {
    return `📊 **组会汇报建议（今日16:30）**\n\n**5分钟框架：**\n1. 实验进展（2min）：样品状态、数量\n2. 数据结果（2min）：横向周期偏差分析图\n3. 问题与方案（0.5min）：载具旋转调整\n4. 下周计划（0.5min）：曝光量实验\n\n**提示：** 翁老师喜欢看过程，不只看结果。提前整理好数据图！`;
  }
  const chat = CHATS.find(c => c.id === chatId);
  return `我理解你问的是「${question}」。\n\n基于「${chat?.name || "当前对话"}」的内容，我可以帮你：\n• 总结关键信息和待办\n• 提取时间节点和DDL\n• 提供行动建议\n\n试试问我：\n• 「最近有哪些DDL」\n• 「中山陵游玩推荐」\n• 「组会要准备什么」`;
}

function getReminderStyles(event: ScheduleEvent) {
  const title = event.title;
  const deadline = `${event.date.slice(5).replace("-","/")} ${event.startTime}`;
  return [
    { label:"温柔学姐风", icon:"🌸", text:`亲爱的，「${title}」${event.type==="task"?"的截止时间快到了":"快到啦"}哦～（${deadline}），记得提前准备，加油你可以的！🌸` },
    { label:"毒舌室友风", icon:"😤", text:`喂！「${title}」，${deadline}，你确定你准备好了？！别到时候哭哭啼啼说来不及了，现在不动手等什么！！😤` },
    { label:"佛系朋友风", icon:"🧘", text:`嗯……「${title}」好像快了……（${deadline}）……去不去，做不做……随缘吧……但……还是……做一下？可能……会好一点？🧘` },
    { label:"正经班委风", icon:"📋", text:`[提醒] 「${title}」时间节点为 ${deadline}，请相关同学按时完成，不接受事后补交。` },
  ];
}

// ────────────────────────────────────────────────────────────
//  工具函数
// ────────────────────────────────────────────────────────────
function addDays(base: string, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function formatDate(d: string): string {
  const months = ["一","二","三","四","五","六","七","八","九","十","十一","十二"];
  const [, m, day] = d.split("-");
  return `${months[parseInt(m)-1]}月${parseInt(day)}日`;
}
function getDayName(d: string): string {
  const days = ["日","一","二","三","四","五","六"];
  return "周" + days[new Date(d).getDay()];
}
function extractDDLFromContent(content: string): Partial<ScheduleEvent> | null {
  const deadlineKw = ["截止","DDL","ddl","提交","到期","结束","开始"];
  const hasKw = deadlineKw.some(kw => content.includes(kw));
  const dateM = content.match(/(\d{1,2})月(\d{1,2})日/);
  const timeM = content.match(/(\d{1,2}):(\d{2})/);
  if (!hasKw && !dateM) return null;
  let date = TODAY;
  if (dateM) {
    const m = parseInt(dateM[1]).toString().padStart(2,"0");
    const d2 = parseInt(dateM[2]).toString().padStart(2,"0");
    date = `2026-${m}-${d2}`;
  }
  const t = timeM ? timeM[0] : "23:59";
  return { date, startTime: t, endTime: t, type: "task", color: "#FFE7BA", priority: "high" };
}
function filterCapsules(caps: Capsule[], filter: CapsuleFilter): Capsule[] {
  if (filter === "all")       return caps;
  if (filter === "high")      return caps.filter(c => c.importance === "high" || c.type === "conflict");
  if (filter === "conflict")  return caps.filter(c => c.type === "conflict");
  if (filter === "confirmed") return caps.filter(c => c.type === "confirmed");
  if (filter === "week")      return caps.filter(c => c.createdAt === TODAY || c.new);
  if (filter === "month")     return caps;
  return caps;
}

const EMPTY_FORM: EventForm = { title:"", date:TODAY, startTime:"09:00", endTime:"10:00", location:"", type:"class", priority:"medium" };

// ────────────────────────────────────────────────────────────
//  主组件
// ────────────────────────────────────────────────────────────
export default function QCapsuleDemo() {
  const [activeChat,     setActiveChat]     = useState<number>(2);
  const [messages,       setMessages]       = useState(INITIAL_MESSAGES);
  const [capsules,       setCapsules]       = useState<Capsule[]>(INITIAL_CAPSULES);
  const [schedule,       setSchedule]       = useState<ScheduleEvent[]>(INITIAL_SCHEDULE);
  const [unreadMap,      setUnreadMap]      = useState<Record<number,number>>(() => Object.fromEntries(CHATS.map(c=>[c.id,c.unread])));
  const [newCapsuleIds,  setNewCapsuleIds]  = useState<number[]>([101,102,103,105,106]);
  const [flyingCapsule,  setFlyingCapsule]  = useState<number|null>(null);
  const [toast,          setToast]          = useState<{msg:string;color:string}|null>(null);
  const [rightTab,       setRightTab]       = useState<"schedule"|"capsule">("schedule");
  const [dailyReport,    setDailyReport]    = useState(false);
  const [scheduleModal,  setScheduleModal]  = useState(false);
  const [searchKw,       setSearchKw]       = useState("");

  // 提醒文案
  const [reminderEvent,  setReminderEvent]  = useState<ScheduleEvent|null>(null);
  const [selectedStyle,  setSelectedStyle]  = useState(0);
  const [sentReminder,   setSentReminder]   = useState(false);

  // AI 总结面板
  const [aiVisible,      setAiVisible]      = useState(false);
  const [aiChatId,       setAiChatId]       = useState<number|null>(null);
  const [aiMessages,     setAiMessages]     = useState<AiMsg[]>([]);
  const [aiInput,        setAiInput]        = useState("");
  const [aiLoading,      setAiLoading]      = useState(false);

  // 右键菜单
  const [ctxMenu,        setCtxMenu]        = useState<CtxMenu>(null);

  // 日程管理
  const [scheduleDate,   setScheduleDate]   = useState(TODAY);
  const [weekStart,      setWeekStart]      = useState(TODAY);
  const [showEventModal, setShowEventModal]  = useState(false);
  const [editingEvent,   setEditingEvent]   = useState<ScheduleEvent|null>(null);
  const [eventForm,      setEventForm]      = useState<EventForm>(EMPTY_FORM);

  // 胶囊筛选 & 图例
  const [capsuleFilter,  setCapsuleFilter]  = useState<CapsuleFilter>("all");
  const [showLegend,     setShowLegend]     = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef   = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, activeChat]);
  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [aiMessages, aiLoading]);

  // 关闭右键菜单（全局点击）
  useEffect(() => {
    const fn = () => setCtxMenu(null);
    window.addEventListener("click", fn);
    return () => window.removeEventListener("click", fn);
  }, []);

  const showToast = (msg: string, color = "#52C41A") => {
    setToast({msg, color});
    setTimeout(() => setToast(null), 2800);
  };

  // ── 选聊天 ──
  const handleSelectChat = (id: number) => {
    setActiveChat(id);
    setUnreadMap(prev => ({...prev, [id]:0}));
    if (aiChatId !== id) setAiVisible(false);
  };

  // ── AI 总结 ──
  const openAiPanel = useCallback((chatId: number, prefill?: string) => {
    setAiChatId(chatId);
    setAiVisible(true);
    setAiInput("");
    if (aiChatId !== chatId) {
      setAiMessages([]);
      setAiLoading(true);
      setTimeout(() => {
        const summary = AI_SUMMARIES[chatId] ||
          `📋 **对话总结**\n\n基于「${CHATS.find(c=>c.id===chatId)?.name}」的消息分析：\n• 最近活跃度较高，对话${(INITIAL_MESSAGES[chatId]||[]).length}条\n• 暂未检测到紧急待办\n\n💡 你可以问我具体问题`;
        setAiMessages([{role:"ai", content:summary}]);
        setAiLoading(false);
        if (prefill) {
          setTimeout(() => {
            setAiMessages(prev => [...prev, {role:"user", content:prefill}]);
            setAiLoading(true);
            setTimeout(() => {
              setAiMessages(p2 => [...p2, {role:"ai", content:getAIFollowup(prefill, chatId)}]);
              setAiLoading(false);
            }, 800);
          }, 400);
        }
      }, 1000);
    } else if (prefill) {
      setAiMessages(prev => [...prev, {role:"user", content:prefill}]);
      setAiLoading(true);
      setTimeout(() => {
        setAiMessages(p2 => [...p2, {role:"ai", content:getAIFollowup(prefill, chatId)}]);
        setAiLoading(false);
      }, 800);
    }
  }, [aiChatId]);

  const sendAiMessage = (text?: string) => {
    const q = text || aiInput.trim();
    if (!q) return;
    setAiMessages(prev => [...prev, {role:"user", content:q}]);
    setAiInput("");
    setAiLoading(true);
    setTimeout(() => {
      setAiMessages(prev => [...prev, {role:"ai", content:getAIFollowup(q, aiChatId||activeChat)}]);
      setAiLoading(false);
    }, 900);
  };

  // ── 右键菜单 ──
  const handleContextMenu = (e: React.MouseEvent, msg: Message, cid: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({x: e.clientX, y: e.clientY, msg, cid});
  };

  const handleAISummarizeMsg = (msg: Message, cid: number) => {
    setCtxMenu(null);
    const q = `请帮我分析这条消息：\n\n"${msg.content.slice(0,200)}"\n\n提炼：1.核心信息 2.是否有待办 3.建议行动`;
    openAiPanel(cid, q);
    setRightTab("schedule");
    setActiveChat(cid);
    setUnreadMap(prev => ({...prev, [cid]:0}));
  };

  const handleDDLExtractMsg = (msg: Message, cid: number) => {
    setCtxMenu(null);
    const sched = extractDDLFromContent(msg.content);
    const chat = CHATS.find(c=>c.id===cid);
    const cap: Capsule = {
      id: Date.now(),
      type: sched ? "pending" : "plan",
      importance: sched ? "high" : "low",
      group: chat?.name || "",
      title: `📎 ${msg.content.slice(0,25)}${msg.content.length>25?"…":""}`,
      content: msg.content.slice(0,120) + (msg.content.length>120?"…":""),
      time: msg.time,
      from: msg.sender,
      new: true,
      createdAt: TODAY,
      scheduleData: sched ? sched : undefined,
    };
    setCapsules(prev => [cap, ...prev]);
    setNewCapsuleIds(prev => [cap.id, ...prev]);
    setFlyingCapsule(cap.id);
    setRightTab("capsule");
    setTimeout(() => setFlyingCapsule(null), 800);
    showToast(sched ? "🟡 DDL已抓取，飞入胶囊栏" : "🔵 内容已提取为参考胶囊", sched ? "#FA8C16" : "#3B82F6");
  };

  // ── 日程操作 ──
  const openAddEvent = () => {
    setEditingEvent(null);
    setEventForm({...EMPTY_FORM, date: scheduleDate});
    setShowEventModal(true);
  };
  const openEditEvent = (ev: ScheduleEvent) => {
    setEditingEvent(ev);
    setEventForm({ title:ev.title, date:ev.date, startTime:ev.startTime, endTime:ev.endTime, location:ev.location||"", type:ev.type, priority:ev.priority||"medium" });
    setShowEventModal(true);
  };
  const saveEvent = () => {
    if (!eventForm.title) return;
    if (editingEvent) {
      setSchedule(prev => prev.map(e => e.id === editingEvent.id ? {...e, ...eventForm, color: e.color} : e));
      showToast("✅ 日程已更新");
    } else {
      const newEv: ScheduleEvent = {
        id: Date.now(),
        date: eventForm.date, startTime: eventForm.startTime, endTime: eventForm.endTime,
        title: eventForm.title, location: eventForm.location || undefined,
        type: eventForm.type,
        color: eventForm.type==="task"?"#FFE7BA":eventForm.type==="exam"?"#FFF0F6":"#E3F2FD",
        priority: eventForm.priority,
      };
      setSchedule(prev => [...prev, newEv]);
      showToast("✅ 日程已添加");
    }
    setShowEventModal(false);
  };
  const deleteEvent = (id: number) => {
    setSchedule(prev => prev.filter(e => e.id !== id));
    showToast("🗑️ 日程已删除", "#8C8C8C");
  };

  // ── 胶囊确认 → 更新日程 ──
  const confirmCapsule = (id: number) => {
    const cap = capsules.find(c => c.id === id);
    setCapsules(prev => prev.map(c => c.id === id ? {...c, type:"confirmed", new:false} : c));
    setNewCapsuleIds(prev => prev.filter(i => i !== id));
    if (cap?.scheduleData) {
      const ev: ScheduleEvent = {
        id: Date.now(),
        date: cap.scheduleData.date || TODAY,
        startTime: cap.scheduleData.startTime || "09:00",
        endTime: cap.scheduleData.endTime || "10:00",
        title: cap.scheduleData.title || cap.title,
        location: cap.scheduleData.location,
        type: cap.scheduleData.type || "task",
        color: cap.scheduleData.color || "#FFE7BA",
        priority: cap.scheduleData.priority || "medium",
        fromCapsule: true,
        groupName: cap.group,
      };
      setSchedule(prev => {
        // 避免重复
        const exists = prev.some(e => e.title === ev.title && e.date === ev.date);
        return exists ? prev : [...prev, ev];
      });
      showToast("✅ 胶囊已确认，日程表已更新", "#52C41A");
      setScheduleDate(ev.date);
      setRightTab("schedule");
    } else {
      showToast("✅ 胶囊已确认", "#52C41A");
    }
  };
  const dismissCapsule = (id: number) => {
    setCapsules(prev => prev.filter(c => c.id !== id));
    setNewCapsuleIds(prev => prev.filter(i => i !== id));
    showToast("已忽略该胶囊", "#8C8C8C");
  };

  // ── Demo 模拟 ──
  const simulateDDL = () => {
    setActiveChat(4);
    setUnreadMap(prev => ({...prev, 4:0}));
    setTimeout(() => {
      const newMsg: Message = { id:Date.now(), sender:"张老师", content:"再次补充：作业5月9日23:59截止，双平台提交，不接受补交！", time:"22:05", self:false };
      setMessages(prev => ({...prev, 4:[...prev[4], newMsg]}));
    }, 400);
    setTimeout(() => {
      const cap: Capsule = { id:Date.now(), type:"pending", importance:"high", group:"计算机网络 · 课程群", title:"📎 作业补充要求", content:"学习通也要交！5/9 23:59 截止，不接受补交", time:"22:05", from:"张老师", new:true, createdAt:TODAY, scheduleData:{ date:"2026-05-09", startTime:"23:00", endTime:"23:59", title:"📎 计网作业截止", type:"task", color:"#FFE7BA", priority:"high" } };
      setCapsules(prev => [cap, ...prev]);
      setNewCapsuleIds(prev => [cap.id, ...prev]);
      setFlyingCapsule(cap.id);
      setRightTab("capsule");
      setTimeout(() => setFlyingCapsule(null), 800);
      showToast("🟡 新胶囊已捕获", "#FA8C16");
    }, 1100);
  };
  const simulateConflict = () => {
    setActiveChat(7);
    setUnreadMap(prev => ({...prev, 7:0}));
    setTimeout(() => {
      const cap: Capsule = { id:Date.now(), type:"conflict", importance:"high", group:"班级群 × 创新赛", title:"🚨 5/18 时间冲突", content:"5/18 紫金山团建（全天）\n5/18 创新创业讲座（10:00-12:00）\n两者重叠，需取舍", time:"20:20", from:"AI 冲突检测", new:true, createdAt:TODAY };
      setCapsules(prev => [cap, ...prev]);
      setNewCapsuleIds(prev => [cap.id, ...prev]);
      setFlyingCapsule(cap.id);
      setRightTab("capsule");
      setTimeout(() => setFlyingCapsule(null), 800);
      showToast("🔴 冲突检测！已生成红色胶囊", "#FF4D4F");
    }, 600);
  };
  const simulateSchedule = () => {
    setActiveChat(13);
    setUnreadMap(prev => ({...prev, 13:0}));
    setTimeout(() => {
      setMessages(prev => ({...prev, 13:[...prev[13], { id:Date.now(), sender:"你", content:"@Q仔 帮我们找下周末共同空闲时间", time:"12:00", self:true }]}));
      setTimeout(() => {
        setMessages(prev => ({...prev, 13:[...prev[13], { id:Date.now()+1, sender:"Q仔", isAI:true, content:"已计算三人共同空闲（隐私保护模式，不展示个人详情）：\n\n① 本周六 14:00–16:00 ✅ 推荐\n② 本周日 10:00–12:00\n③ 下周六 15:00–17:00", time:"12:00", self:false }]}));
        setScheduleModal(true);
      }, 700);
    }, 400);
  };

  // ── 计算周列表 ──
  const weekDays = Array.from({length:7}, (_,i) => addDays(weekStart, i));
  const eventDates = new Set(schedule.map(e => e.date));
  const currentDayEvents = schedule.filter(e => e.date === scheduleDate).sort((a,b) => a.startTime.localeCompare(b.startTime));

  // ── 辅助 ──
  const currentChat  = CHATS.find(c => c.id === activeChat);
  const filteredChats = CHATS.filter(c => !searchKw || c.name.toLowerCase().includes(searchKw.toLowerCase()));
  const pendingCount  = capsules.filter(c => c.type==="pending"||c.type==="conflict").length;
  const totalUnread   = Object.values(unreadMap).reduce((s,v)=>s+v,0);
  const filteredCaps  = filterCapsules(capsules, capsuleFilter);
  const reminderStyles = reminderEvent ? getReminderStyles(reminderEvent) : [];

  // ════════════════════════════════════════════════════════════
  //  渲染
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",background:"#F0F2F5",fontFamily:"'PingFang SC','Microsoft YaHei',sans-serif",overflow:"hidden",position:"relative",color:"#333"}}>
      {/* Toast */}
      {toast && <div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 22px",borderRadius:24,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.18)"}}>{toast.msg}</div>}

      {/* 右键菜单 */}
      {ctxMenu && (
        <div onClick={e=>e.stopPropagation()} style={{position:"fixed",left:ctxMenu.x,top:ctxMenu.y,background:"#fff",border:"1px solid #E5E8EE",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.14)",zIndex:9998,minWidth:160,overflow:"hidden"}}>
          <div onClick={()=>handleAISummarizeMsg(ctxMenu.msg,ctxMenu.cid)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            ✨ AI总结此消息
          </div>
          <div style={{height:1,background:"#F0F0F0"}}/>
          <div onClick={()=>handleDDLExtractMsg(ctxMenu.msg,ctxMenu.cid)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            📎 DDL抓取此内容
          </div>
          <div style={{height:1,background:"#F0F0F0"}}/>
          <div onClick={()=>{navigator.clipboard?.writeText(ctxMenu.msg.content).catch(()=>{}); setCtxMenu(null);}} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,color:"#666",display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            📋 复制文本
          </div>
        </div>
      )}

      {/* ══ 导航条 ══ */}
      <div style={{width:56,background:"linear-gradient(180deg,#2D3138 0%,#1F2329 100%)",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:16,gap:4}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",marginBottom:12,border:"2px solid #fff"}}>小A</div>
        {[{icon:"💬",badge:totalUnread,active:true},{icon:"👥"},{icon:"📁"},{icon:"🎮"},{icon:"📅"}].map((item,i)=>(
          <div key={i} style={{position:"relative",width:40,height:40,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",background:item.active?"rgba(74,144,217,0.2)":"transparent",color:item.active?"#4A90D9":"#9DA1A6"}}>
            {item.icon}
            {item.badge&&item.badge>0?<div style={{position:"absolute",top:-2,right:-2,background:"#FF4D4F",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,minWidth:16,textAlign:"center"}}>{item.badge>99?"99+":item.badge}</div>:null}
          </div>
        ))}
        <div style={{flex:1}}/>
        <div style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",marginBottom:12}}>Q</div>
      </div>

      {/* ══ 聊天列表 ══ */}
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
            const lastMsgs = messages[chat.id]||[];
            const previewMsg = lastMsgs[lastMsgs.length-1];
            const previewText = previewMsg?(previewMsg.isSystem?previewMsg.content:`${previewMsg.self?"":previewMsg.sender+": "}${previewMsg.content.replace(/\n/g," ").slice(0,20)}`):chat.lastMsg;
            const unread = unreadMap[chat.id]||0;
            return (
              <div key={chat.id} onClick={()=>handleSelectChat(chat.id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",background:activeChat===chat.id?"#E8F0FE":chat.pinned?"#FAFBFD":"transparent",borderBottom:"1px solid #F5F5F5",transition:"background 0.12s"}}
                onMouseEnter={e=>{if(activeChat!==chat.id)(e.currentTarget as HTMLElement).style.background="#F5F7FA";}}
                onMouseLeave={e=>{if(activeChat!==chat.id)(e.currentTarget as HTMLElement).style.background=chat.pinned?"#FAFBFD":"transparent";}}>
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
            <div style={{fontSize:11.5,fontWeight:600,color:"#4A90D9"}}>Q 仔时间胶囊</div>
            <div style={{fontSize:10,color:"#999"}}>静默监听中 · 已抓 {capsules.length} 个胶囊</div>
          </div>
          {pendingCount>0&&<div style={{background:"#FA8C16",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{pendingCount}</div>}
        </div>
      </div>

      {/* ══ 聊天区 ══ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#F0F2F5",minWidth:0}}>
        {/* 顶栏 */}
        <div style={{padding:"12px 20px",background:"#fff",borderBottom:"1px solid #E5E5E5",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:6,background:currentChat?.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>{currentChat?.avatar}</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#333"}}>{currentChat?.name}{currentChat?.count&&<span style={{fontSize:12,color:"#999",marginLeft:6,fontWeight:400}}>({currentChat.count})</span>}</div>
              <div style={{fontSize:11,color:"#999",marginTop:1}}>{currentChat?.type==="private"?(currentChat.online?"● 在线":"离线"):`${currentChat?.category}群`}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>openAiPanel(activeChat)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 12px",background:aiVisible&&aiChatId===activeChat?"linear-gradient(135deg,#4A90D9,#7B68EE)":"#F0F7FF",color:aiVisible&&aiChatId===activeChat?"#fff":"#4A90D9",border:"1.5px solid #BAE0FF",borderRadius:14,fontSize:12,fontWeight:600,cursor:"pointer"}}>✨ AI总结</button>
            <div style={{fontSize:11,color:"#4A90D9",background:"#E8F0FE",padding:"4px 10px",borderRadius:12,border:"1px solid #BAE0FF",display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#52C41A",display:"inline-block"}}/>Q仔监听中
            </div>
          </div>
        </div>
        {/* 消息区 */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 20px",display:"flex",flexDirection:"column",gap:4}}>
          {(messages[activeChat]||[]).map((msg,idx)=>{
            const prev = (messages[activeChat]||[])[idx-1];
            const showDate = msg.date&&(!prev||prev.date!==msg.date);
            if (msg.isSystem) return (
              <div key={msg.id}>
                {showDate&&<div style={{textAlign:"center",margin:"16px 0 12px",fontSize:11,color:"#999"}}><span style={{background:"#E5E8EE",padding:"3px 12px",borderRadius:10}}>{msg.date}</span></div>}
                <div style={{textAlign:"center",margin:"6px 0",fontSize:11,color:"#999"}}>{msg.content}</div>
              </div>
            );
            return (
              <div key={msg.id}>
                {showDate&&<div style={{textAlign:"center",margin:"16px 0 12px",fontSize:11,color:"#999"}}><span style={{background:"#E5E8EE",padding:"3px 12px",borderRadius:10}}>{msg.date}</span></div>}
                <div style={{display:"flex",flexDirection:msg.self?"row-reverse":"row",alignItems:"flex-start",gap:8,marginBottom:10}}>
                  <div style={{width:36,height:36,borderRadius:6,flexShrink:0,background:msg.isAI?"linear-gradient(135deg,#4A90D9,#9B59B6)":msg.self?"linear-gradient(135deg,#4A90D9,#7B68EE)":`hsl(${(msg.sender.charCodeAt(0)*17)%360},60%,60%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>
                    {msg.isAI?"Q":msg.self?"我":msg.sender.slice(0,1)}
                  </div>
                  <div style={{maxWidth:"62%",display:"flex",flexDirection:"column",alignItems:msg.self?"flex-end":"flex-start"}}>
                    {!msg.self&&<div style={{fontSize:11,color:msg.isAI?"#4A90D9":"#666",marginBottom:3,fontWeight:msg.isAI?600:400}}>{msg.isAI?"Q 仔 · AI助手":msg.sender}<span style={{color:"#bbb",marginLeft:6,fontSize:10}}>{msg.time}</span></div>}
                    <div onContextMenu={e=>handleContextMenu(e,msg,activeChat)}
                      style={{padding:"8px 12px",borderRadius:msg.self?"10px 4px 10px 10px":"4px 10px 10px 10px",background:msg.self?"#A6D8FF":msg.isAI?"linear-gradient(135deg,#F0F7FF,#F5F0FF)":"#fff",color:"#333",fontSize:13.5,lineHeight:1.55,border:msg.atMe?"1.5px solid #FA8C16":msg.isAI?"1px solid #BAE0FF":"1px solid #EAEAEA",whiteSpace:"pre-line",wordBreak:"break-word",boxShadow:"0 1px 2px rgba(0,0,0,0.04)",cursor:"context-menu",userSelect:"text"}}>
                      {msg.content}
                    </div>
                    {msg.self&&<div style={{fontSize:10,color:"#bbb",marginTop:3}}>{msg.time}</div>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef}/>
        </div>
        {/* 输入框 */}
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

      {/* ══ 右侧面板 ══ */}
      <div style={{width:360,background:"#fff",borderLeft:"1px solid #E5E5E5",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* ─ AI 总结面板 ─ */}
        {aiVisible && (
          <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #F0F0F0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,#F0F7FF 0%,#F5F0FF 100%)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:6,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>Q</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#333"}}>Q仔 · AI 对话总结</div>
                  <div style={{fontSize:10,color:"#999"}}>基于「{CHATS.find(c=>c.id===aiChatId)?.name}」</div>
                </div>
              </div>
              <button onClick={()=>setAiVisible(false)} style={{fontSize:18,color:"#999",cursor:"pointer",background:"none",border:"none",padding:"0 4px"}}>×</button>
            </div>
            {/* ← 关键：overflow-y:auto + flex:1 + minHeight:0 实现滚动 */}
            <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
              {aiMessages.map((msg,i)=>(
                <div key={i} style={{display:"flex",flexDirection:msg.role==="user"?"row-reverse":"row",alignItems:"flex-start",gap:6}}>
                  <div style={{width:26,height:26,borderRadius:5,flexShrink:0,background:msg.role==="user"?"#4A90D9":"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{msg.role==="user"?"我":"Q"}</div>
                  <div style={{maxWidth:"82%",padding:"9px 12px",borderRadius:msg.role==="user"?"10px 4px 10px 10px":"4px 10px 10px 10px",background:msg.role==="user"?"#A6D8FF":"#F5F7FA",fontSize:12.5,color:"#333",lineHeight:1.6,whiteSpace:"pre-line",border:"1px solid "+(msg.role==="user"?"transparent":"#E5E8EE")}}>{msg.content}</div>
                </div>
              ))}
              {aiLoading&&(
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:26,height:26,borderRadius:5,background:"linear-gradient(135deg,#4A90D9,#9B59B6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>Q</div>
                  <div style={{padding:"8px 12px",borderRadius:"4px 10px 10px 10px",background:"#F5F7FA",fontSize:12,color:"#999"}}>Q仔思考中…</div>
                </div>
              )}
              <div ref={aiEndRef}/>
            </div>
            {aiMessages.length<=1&&!aiLoading&&(
              <div style={{padding:"8px 14px",borderTop:"1px solid #F0F0F0",flexShrink:0}}>
                <div style={{fontSize:10.5,color:"#999",marginBottom:7}}>快速提问</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(aiChatId===13?["中山陵游玩推荐🗺️","附近有什么好吃的🍜","需要提前预约吗🎫","最近有哪些DDL⏰"]:aiChatId===9?["还有哪些DDL⏰","PPT改哪里💡","最近有哪些DDL⏰","生成催稿文案📨"]:["最近有哪些DDL⏰","总结一下待办📝","今天需要做什么","组会要准备什么"]).map((q,i)=>(
                    <button key={i} onClick={()=>sendAiMessage(q)} style={{padding:"5px 10px",borderRadius:12,border:"1px solid #E5E8EE",background:"#FAFBFD",color:"#4A90D9",fontSize:11,fontWeight:500,cursor:"pointer"}}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{padding:"10px 12px",borderTop:"1px solid #F0F0F0",display:"flex",gap:6,flexShrink:0}}>
              <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&aiInput.trim())sendAiMessage();}} placeholder='问问Q仔，如「中山陵游玩推荐」' style={{flex:1,height:32,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:12,outline:"none",color:"#333"}}/>
              <button onClick={()=>sendAiMessage()} style={{padding:"0 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>发送</button>
            </div>
          </div>
        )}

        {/* ─ 普通 Tab（日程 / 胶囊）─ */}
        {!aiVisible && (
          <>
            <div style={{display:"flex",borderBottom:"1px solid #E5E5E5",background:"#FAFBFD",flexShrink:0}}>
              {[{key:"schedule",label:"📅 日程",count:0},{key:"capsule",label:"🟡 胶囊",count:pendingCount}].map(tab=>(
                <button key={tab.key} onClick={()=>setRightTab(tab.key as any)} style={{flex:1,padding:"12px",border:"none",background:rightTab===tab.key?"#fff":"transparent",color:rightTab===tab.key?"#4A90D9":"#666",fontSize:12.5,fontWeight:rightTab===tab.key?700:500,cursor:"pointer",borderBottom:rightTab===tab.key?"2px solid #4A90D9":"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {tab.label}{tab.count>0&&<span style={{background:rightTab===tab.key?"#4A90D9":"#FA8C16",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{tab.count}</span>}
                </button>
              ))}
            </div>

            {/* ─ 日程表 ─ */}
            {rightTab==="schedule" && (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
                {/* 周选择 */}
                <div style={{padding:"10px 12px",background:"linear-gradient(135deg,#F5F0FF 0%,#FFF0F5 100%)",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                  <div style={{fontSize:11,color:"#9B59B6",fontWeight:600,marginBottom:6}}>2024-2025学年 第2学期</div>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>
                    <button onClick={()=>setWeekStart(addDays(weekStart,-7))} style={{border:"none",background:"transparent",cursor:"pointer",color:"#666",fontSize:16,padding:"0 4px"}}>◀</button>
                    <div style={{flex:1,display:"flex",gap:3}}>
                      {weekDays.map(d=>{
                        const hasEv = eventDates.has(d);
                        const isToday = d===TODAY;
                        const isSel  = d===scheduleDate;
                        return (
                          <div key={d} onClick={()=>setScheduleDate(d)} style={{flex:1,textAlign:"center",padding:"4px 2px",borderRadius:6,background:isSel?"#4A90D9":isToday?"#E8F0FE":"transparent",cursor:"pointer",border:isToday&&!isSel?"1px solid #4A90D9":"1px solid transparent"}}>
                            <div style={{fontSize:10,color:isSel?"#fff":isToday?"#4A90D9":"#999"}}>{getDayName(d)}</div>
                            <div style={{fontSize:12,fontWeight:isSel?700:400,color:isSel?"#fff":isToday?"#4A90D9":"#333"}}>{d.slice(8)}</div>
                            {hasEv&&<div style={{width:4,height:4,borderRadius:"50%",background:isSel?"#fff":"#4A90D9",margin:"2px auto 0"}}/>}
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={()=>setWeekStart(addDays(weekStart,7))} style={{border:"none",background:"transparent",cursor:"pointer",color:"#666",fontSize:16,padding:"0 4px"}}>▶</button>
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#333"}}>{formatDate(scheduleDate)} {getDayName(scheduleDate)}</div>
                    <button onClick={openAddEvent} style={{padding:"3px 10px",borderRadius:8,border:"1.5px solid #4A90D9",background:"transparent",color:"#4A90D9",fontSize:11,fontWeight:600,cursor:"pointer"}}>+ 添加</button>
                  </div>
                </div>
                {/* 事件列表 */}
                <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:7,minHeight:0}}>
                  {currentDayEvents.length===0?(
                    <div style={{padding:30,textAlign:"center",color:"#bbb",fontSize:13}}>暂无日程 🐟<br/><span style={{fontSize:11}}>点击「+ 添加」新建日程</span></div>
                  ):currentDayEvents.map(ev=>{
                    const pc = getPriorityColor(ev.priority);
                    return (
                      <div key={ev.id} onClick={()=>setReminderEvent(ev)}
                        style={{display:"flex",gap:8,padding:"9px 11px",background:ev.color,borderRadius:9,border:"1px solid rgba(0,0,0,0.06)",cursor:"pointer",transition:"transform 0.1s,box-shadow 0.1s",position:"relative"}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-1px)";(e.currentTarget as HTMLElement).style.boxShadow="0 4px 12px rgba(0,0,0,0.1)";}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="";(e.currentTarget as HTMLElement).style.boxShadow="";}}>
                        <div style={{width:4,borderRadius:2,background:pc,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:"#333",display:"flex",alignItems:"center",gap:6}}>
                            {ev.title}
                            <span style={{fontSize:10,background:pc+"22",color:pc,padding:"1px 5px",borderRadius:6,fontWeight:600,flexShrink:0}}>{ev.priority==="high"?"紧急":ev.priority==="medium"?"重要":"一般"}</span>
                          </div>
                          <div style={{fontSize:10.5,color:"#666",marginTop:2}}>🕒 {ev.startTime}–{ev.endTime}{ev.location&&<span style={{marginLeft:8}}>📍 {ev.location}</span>}</div>
                          {ev.fromCapsule&&<div style={{fontSize:10,color:"#4A90D9",marginTop:2,fontWeight:600}}>🟡 来自胶囊 · {ev.groupName}</div>}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                          <button onClick={e=>{e.stopPropagation();openEditEvent(ev);}} style={{padding:"2px 7px",borderRadius:5,border:"1px solid #d0d0d0",background:"#fff",color:"#666",fontSize:10,cursor:"pointer"}}>✏️</button>
                          <button onClick={e=>{e.stopPropagation();deleteEvent(ev.id);}} style={{padding:"2px 7px",borderRadius:5,border:"1px solid #ffa39e",background:"#fff",color:"#FF4D4F",fontSize:10,cursor:"pointer"}}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* 优先级说明 */}
                <div style={{padding:"6px 12px",borderTop:"1px solid #F0F0F0",background:"#FAFBFD",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontSize:10,color:"#999"}}>优先级：</span>
                  {[{c:"#FF4D4F",l:"紧急"},{c:"#FA8C16",l:"重要"},{c:"#52C41A",l:"一般"}].map(({c,l})=>(
                    <span key={l} style={{fontSize:10,display:"flex",alignItems:"center",gap:3}}><span style={{width:6,height:6,borderRadius:"50%",background:c,display:"inline-block"}}/>{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ─ 时间胶囊 ─ */}
            {rightTab==="capsule" && (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
                {/* 筛选栏 + 图例 */}
                <div style={{padding:"8px 12px",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    {(["all","week","high","conflict","confirmed"] as CapsuleFilter[]).map(f=>{
                      const labels:Record<string,string>={all:"全部",week:"近一周",high:"🔴 紧急",conflict:"⚠️ 冲突",confirmed:"✅ 已确认"};
                      return <button key={f} onClick={()=>setCapsuleFilter(f)} style={{padding:"3px 8px",borderRadius:8,border:"1px solid "+(capsuleFilter===f?"#4A90D9":"#E5E8EE"),background:capsuleFilter===f?"#E8F0FE":"transparent",color:capsuleFilter===f?"#4A90D9":"#666",fontSize:11,fontWeight:capsuleFilter===f?700:400,cursor:"pointer"}}>{labels[f]}</button>;
                    })}
                    <button onClick={()=>setShowLegend(!showLegend)} style={{marginLeft:"auto",padding:"3px 8px",borderRadius:8,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:11,cursor:"pointer"}}>? 图例</button>
                  </div>
                  {showLegend&&(
                    <div style={{background:"#FAFBFD",border:"1px solid #E5E8EE",borderRadius:8,padding:"8px 10px",marginTop:4}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#333",marginBottom:6}}>胶囊颜色说明</div>
                      {[
                        {emoji:"🔴",label:"紧急",desc:"时间冲突或3天内截止"},
                        {emoji:"🟠",label:"重要",desc:"一周内截止"},
                        {emoji:"🟡",label:"一般",desc:"普通待办事项"},
                        {emoji:"🟢",label:"已确认",desc:"已写入日程"},
                        {emoji:"🔵",label:"方案参考",desc:"规划信息"},
                        {emoji:"⚫",label:"敏感信息",desc:"隐私保护"},
                      ].map(({emoji,label,desc})=>(
                        <div key={label} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,fontSize:11}}>
                          <span>{emoji}</span>
                          <span style={{fontWeight:600,color:"#333",width:50}}>{label}</span>
                          <span style={{color:"#999"}}>{desc}</span>
                        </div>
                      ))}
                      <div style={{fontSize:10,color:"#FA8C16",marginTop:4}}>⚡ 冲突时优先处理重要度更高的事项</div>
                    </div>
                  )}
                  <div style={{fontSize:11,color:"#999",marginTop:2}}>显示 {filteredCaps.length}/{capsules.length} 个胶囊</div>
                </div>
                {/* 胶囊列表 */}
                <div style={{flex:1,overflowY:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
                  {filteredCaps.length===0&&<div style={{textAlign:"center",padding:30,color:"#bbb",fontSize:13}}>暂无符合条件的胶囊</div>}
                  {filteredCaps.map(cap=>{
                    const st = getCapsuleStyle(cap);
                    const isNew   = newCapsuleIds.includes(cap.id);
                    const isFlying = flyingCapsule===cap.id;
                    return (
                      <div key={cap.id} style={{background:st.bg,border:`1.5px solid ${st.border}`,borderRadius:12,padding:"10px 12px",transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",transform:isFlying?"scale(1.04)":"scale(1)",boxShadow:isNew?`0 0 0 2px ${st.border}66,0 4px 14px ${st.border}44`:"0 1px 4px rgba(0,0,0,0.05)"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:st.dot,flexShrink:0}}/>
                          <span style={{fontSize:12.5,fontWeight:700,color:"#1a1a2e",flex:1}}>{cap.title}</span>
                          <span style={{fontSize:10,fontWeight:600,color:st.badge,background:st.badge+"22",padding:"1px 7px",borderRadius:8}}>{st.label}</span>
                        </div>
                        <div style={{fontSize:11.5,color:"#3a3a5c",lineHeight:1.55,marginBottom:8,whiteSpace:"pre-line"}}>{cap.type==="sensitive"?"●●●● ●●●●●●●● ●●":cap.content}</div>
                        <div style={{fontSize:10,color:"#999",marginBottom:cap.type!=="confirmed"?8:0}}>📍 {cap.group} · {cap.from} · {cap.time}</div>
                        {cap.type!=="confirmed"&&(
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={()=>confirmCapsule(cap.id)} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",background:st.badge,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>✓ {cap.scheduleData?"确认入日程":"确认"}</button>
                            <button onClick={()=>dismissCapsule(cap.id)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${st.border}`,background:"transparent",color:"#999",fontSize:11,cursor:"pointer"}}>✗</button>
                          </div>
                        )}
                        {cap.type==="confirmed"&&<div style={{fontSize:11,color:"#52C41A",fontWeight:600}}>✓ 已加入日程</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ 演示按钮 ══ */}
      <div style={{position:"fixed",bottom:16,left:380,background:"rgba(255,255,255,0.97)",border:"1px solid #E5E5E5",borderRadius:18,padding:"8px 14px",display:"flex",gap:8,alignItems:"center",boxShadow:"0 8px 32px rgba(0,0,0,0.12)",zIndex:1000}}>
        <span style={{fontSize:11,color:"#4A90D9",fontWeight:700,marginRight:4}}>🎮 演示</span>
        {[{label:"📎 DDL抓取",action:simulateDDL,color:"#FA8C16"},{label:"🚨 冲突检测",action:simulateConflict,color:"#FF4D4F"},{label:"📅 群体排期",action:simulateSchedule,color:"#7B68EE"},{label:"📋 日报",action:()=>setDailyReport(true),color:"#4A90D9"}].map(btn=>(
          <button key={btn.label} onClick={btn.action} style={{padding:"5px 11px",borderRadius:10,border:`1.5px solid ${btn.color}55`,background:btn.color+"15",color:btn.color,fontSize:11,fontWeight:600,cursor:"pointer"}}>{btn.label}</button>
        ))}
      </div>

      {/* ══ 弹窗：添加/编辑日程 ══ */}
      {showEventModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setShowEventModal(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:"24px",width:400,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:18}}>{editingEvent?"✏️ 编辑日程":"+ 添加日程"}</div>
            {([
              {label:"标题",key:"title",type:"text",placeholder:"日程标题"},
              {label:"日期",key:"date",type:"date"},
              {label:"开始时间",key:"startTime",type:"time"},
              {label:"结束时间",key:"endTime",type:"time"},
              {label:"地点（选填）",key:"location",type:"text",placeholder:"如：教三-204"},
            ] as {label:string;key:string;type:string;placeholder?:string}[]).map(field=>(
              <div key={field.key} style={{marginBottom:12}}>
                <div style={{fontSize:12,color:"#666",marginBottom:4}}>{field.label}</div>
                <input type={field.type} value={(eventForm as any)[field.key]} placeholder={field.placeholder} onChange={e=>setEventForm(prev=>({...prev,[field.key]:e.target.value}))} style={{width:"100%",height:34,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333",boxSizing:"border-box"}}/>
              </div>
            ))}
            <div style={{display:"flex",gap:12,marginBottom:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"#666",marginBottom:4}}>类型</div>
                <select value={eventForm.type} onChange={e=>setEventForm(prev=>({...prev,type:e.target.value as ScheduleEvent["type"]}))} style={{width:"100%",height:34,padding:"0 8px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333"}}>
                  <option value="class">课程</option>
                  <option value="task">任务/DDL</option>
                  <option value="event">活动</option>
                  <option value="exam">考试/答辩</option>
                </select>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"#666",marginBottom:4}}>优先级</div>
                <select value={eventForm.priority} onChange={e=>setEventForm(prev=>({...prev,priority:e.target.value as Priority}))} style={{width:"100%",height:34,padding:"0 8px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333"}}>
                  <option value="high">🔴 紧急</option>
                  <option value="medium">🟠 重要</option>
                  <option value="low">🟡 一般</option>
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveEvent} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>保存</button>
              <button onClick={()=>setShowEventModal(false)} style={{padding:"10px 18px",borderRadius:10,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ 弹窗：提醒文案 ══ */}
      {reminderEvent && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>{setReminderEvent(null);setSentReminder(false);}}>
          <div style={{background:"#fff",borderRadius:16,padding:"26px",width:420,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:800,color:"#333",marginBottom:4}}>💬 生成提醒文案</div>
            <div style={{fontSize:12,color:"#4A90D9",background:"#EFF6FF",padding:"6px 10px",borderRadius:8,marginBottom:14,fontWeight:500}}>
              针对：{reminderEvent.title}　{reminderEvent.date.slice(5).replace("-","/")} {reminderEvent.startTime}
              <span style={{marginLeft:8,fontSize:10,color:getPriorityColor(reminderEvent.priority),fontWeight:700}}>{reminderEvent.priority==="high"?"🔴 紧急":reminderEvent.priority==="medium"?"🟠 重要":"🟡 一般"}</span>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
              {reminderStyles.map((s,i)=>(
                <button key={i} onClick={()=>setSelectedStyle(i)} style={{padding:"5px 10px",borderRadius:10,border:`1.5px solid ${selectedStyle===i?"#4A90D9":"#E5E8EE"}`,background:selectedStyle===i?"#E8F0FE":"#fff",color:selectedStyle===i?"#4A90D9":"#666",fontSize:11.5,cursor:"pointer",fontWeight:selectedStyle===i?700:400}}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
            <div style={{background:"#F8F9FB",border:"1px solid #E5E8EE",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#333",lineHeight:1.6,marginBottom:16,minHeight:64}}>{reminderStyles[selectedStyle]?.text}</div>
            {!sentReminder?(
              <button onClick={()=>setSentReminder(true)} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>一键发送提醒</button>
            ):(
              <div style={{textAlign:"center",color:"#52C41A",fontWeight:700,fontSize:14,padding:"10px 0"}}>✅ 提醒已发送！</div>
            )}
          </div>
        </div>
      )}

      {/* ══ 弹窗：日报 ══ */}
      {dailyReport && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>setDailyReport(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:"26px 28px",width:380,boxShadow:"0 20px 60px rgba(74,144,217,0.2)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:13,color:"#4A90D9",fontWeight:700,marginBottom:4}}>🌙 Q 仔 · 晚间日报</div>
            <div style={{fontSize:20,fontWeight:800,color:"#333",marginBottom:16}}>今天有 {pendingCount} 条待确认</div>
            {capsules.filter(c=>c.type==="pending"||c.type==="conflict").slice(0,3).map(cap=>{
              const st=getCapsuleStyle(cap);
              return <div key={cap.id} style={{background:st.bg,border:`1px solid ${st.border}`,borderRadius:8,padding:"9px 12px",marginBottom:6}}><div style={{fontSize:12.5,fontWeight:700,color:"#1a1a2e"}}>{cap.title}</div><div style={{fontSize:11,color:"#666",marginTop:3}}>{cap.content.slice(0,50)}…</div></div>;
            })}
            <div style={{fontSize:11,color:"#999",margin:"12px 0"}}>点击「开始确认」前往胶囊栏处理</div>
            <button onClick={()=>{setDailyReport(false);setRightTab("capsule");}} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>开始确认 →</button>
          </div>
        </div>
      )}

      {/* ══ 弹窗：群体排期 ══ */}
      {scheduleModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>setScheduleModal(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:"26px",width:380}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:4}}>📅 Q 仔 · 群体排期</div>
            <div style={{fontSize:12,color:"#999",marginBottom:16}}>已计算三人共同空闲（不展示个人详细安排）</div>
            {[{time:"本周六 14:00–16:00",hot:true,date:"2026-05-02"},{time:"本周日 10:00–12:00",hot:false,date:"2026-05-03"},{time:"下周六 15:00–17:00",hot:false,date:"2026-05-09"}].map((slot,i)=>(
              <div key={i} style={{background:slot.hot?"#F5F0FF":"#FAFBFD",border:`1.5px solid ${slot.hot?"#7B68EE":"#E5E8EE"}`,borderRadius:10,padding:"11px 14px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:13,color:slot.hot?"#7B68EE":"#666",fontWeight:slot.hot?700:400}}>{slot.hot&&"🔥 "}{slot.time}</span>
                <button onClick={()=>{
                  const newEv:ScheduleEvent={id:Date.now(),date:slot.date,startTime:slot.hot?"14:00":"10:00",endTime:slot.hot?"16:00":"12:00",title:"🌸 中山陵出游",type:"event",color:"#FCE4EC",priority:"low"};
                  setSchedule(prev=>[...prev,newEv]);
                  setScheduleDate(slot.date);
                  setScheduleModal(false);
                  showToast("✅ 已写入所有人日程！","#7B68EE");
                }} style={{padding:"4px 11px",borderRadius:6,border:"none",background:slot.hot?"#7B68EE":"#BFBFBF",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>就这个</button>
              </div>
            ))}
            <div style={{fontSize:10.5,color:"#bbb",marginTop:6}}>* 任一人确认后自动写入全部参与者日程</div>
          </div>
        </div>
      )}

      <style>{`::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#D9DCE0;border-radius:4px;}input::placeholder{color:#BFBFBF;}`}</style>
    </div>
  );
}

