"use client";
import React, { useState, useEffect, useRef } from "react";

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
type ScheduleEvent = {
  id: number; date: string; startTime: string; endTime: string;
  title: string; location?: string;
  type: "class" | "task" | "event" | "exam";
  color: string; fromCapsule?: boolean; groupName?: string;
};
type Capsule = {
  id: number; type: "pending" | "confirmed" | "conflict" | "plan" | "sensitive";
  group: string; title: string; content: string; time: string;
  from: string; new: boolean; scheduleData?: Partial<ScheduleEvent>;
};
type AiMsg = { role: "user" | "ai"; content: string };

// ────────────────────────────────────────────────────────────
//  聊天列表
// ────────────────────────────────────────────────────────────
const CHATS: Chat[] = [
  { id: 1,  type: "group",   name: "2026PCG校园AI产品创意大赛官方沟通群", category: "竞赛",    avatar: "🏆", color: "#FF6B6B", count: 1010, lastTime: "15:08", lastMsg: "云上枫加入了群聊",          unread: 9, pinned: true  },
  { id: 2,  type: "group",   name: "王老师课题组 | 光学组",               category: "科研",    avatar: "🔬", color: "#7B68EE", count: 18,   lastTime: "16:32", lastMsg: "翁一士: 明日组会线上",       unread: 6, pinned: true  },
  { id: 3,  type: "private", name: "张师兄",                              category: "联系人",  avatar: "张", color: "#52C41A",             lastTime: "15:42", lastMsg: "图纸我下午发你",            unread: 1, online: true  },
  { id: 4,  type: "group",   name: "计算机网络 · 课程群",                 category: "课程",    avatar: "📡", color: "#4A90D9", count: 247,  lastTime: "14:20", lastMsg: "张老师: 周五DDL，提交学习通", unread: 3                },
  { id: 5,  type: "group",   name: "数据结构与算法-2024秋",               category: "课程",    avatar: "📚", color: "#1989FA", count: 189,  lastTime: "11:08", lastMsg: "[图片]",                   unread: 0                },
  { id: 6,  type: "group",   name: "操作系统课程群",                      category: "课程",    avatar: "💻", color: "#13C2C2", count: 156,  lastTime: "昨天",  lastMsg: "助教: 实验3报告模板已上传",  unread: 0                },
  { id: 7,  type: "group",   name: "计科2101班级群",                      category: "班级",    avatar: "🎓", color: "#52C41A", count: 32,   lastTime: "10:45", lastMsg: "班长: 班费收缴通知",         unread: 2                },
  { id: 8,  type: "group",   name: "计算机学院2026届毕业群",              category: "学院",    avatar: "🏫", color: "#FA8C16", count: 487,  lastTime: "昨天",  lastMsg: "[公告] 毕业论文盲审说明",    unread: 0                },
  { id: 9,  type: "group",   name: "Team Phoenix · 创新创业大赛",         category: "竞赛",    avatar: "🔥", color: "#FF4D4F", count: 5,    lastTime: "13:22", lastMsg: "我把PPT v3发群里了",         unread: 4                },
  { id: 10, type: "private", name: "队友 刘正昂",                         category: "联系人",  avatar: "刘", color: "#FF6B6B",             lastTime: "01:48", lastMsg: "[图片]",                   unread: 0                },
  { id: 11, type: "group",   name: "光影摄影社·成员群",                   category: "社团",    avatar: "📷", color: "#9B59B6", count: 89,   lastTime: "昨天",  lastMsg: "周六外拍改情人谷",           unread: 0                },
  { id: 12, type: "group",   name: "校学生会宣传部",                      category: "学生组织", avatar: "📢", color: "#FFB347", count: 24,   lastTime: "周一",  lastMsg: "[文件] 5月活动排期.xlsx",    unread: 0                },
  { id: 13, type: "private", name: "小美 💕",                             category: "好友",    avatar: "美", color: "#FF85A2",             lastTime: "11:38", lastMsg: "👍 中山陵下午2点见",         unread: 0, online: true  },
  { id: 14, type: "private", name: "班长 李同学",                         category: "联系人",  avatar: "李", color: "#52C41A",             lastTime: "10:50", lastMsg: "班费的事麻烦下",             unread: 1                },
  { id: 15, type: "private", name: "妈妈 ❤️",                            category: "家人",    avatar: "妈", color: "#F5222D",             lastTime: "昨天",  lastMsg: "记得吃饭啊孩子",             unread: 0                },
  { id: 16, type: "group",   name: "毕业摆烂群😴",                        category: "闲聊",    avatar: "🛋️", color: "#8C8C8C", count: 8,    lastTime: "昨天",  lastMsg: "今天又没去图书馆",           unread: 0                },
  { id: 17, type: "group",   name: "校园活动志愿者群",                    category: "活动",    avatar: "🎪", color: "#36CFC9", count: 64,   lastTime: "周日",  lastMsg: "5/12志愿排班已出",           unread: 0                },
];

// ────────────────────────────────────────────────────────────
//  消息（每个会话 20+ 条）
// ────────────────────────────────────────────────────────────
const INITIAL_MESSAGES: Record<number, Message[]> = {
  // 1. PCG大赛官方群
  1: [
    { id: 1,  sender: "system",       content: "hzh加入了群聊",            time: "14:15", self: false, isSystem: true },
    { id: 2,  sender: "system",       content: "Ashley加入了群聊",         time: "14:16", self: false, isSystem: true },
    { id: 3,  sender: "大赛官助sasa",  content: "🎉【PCG校园AI产品创意大赛·选手沟通群公告】Hi～欢迎各位参赛选手！本次大赛由腾讯PCG主办，聚焦AI Native产品方案设计与落地，旨在发掘最具创造力的校园团队。", time: "14:20", self: false, date: "4月22日 周二" },
    { id: 4,  sender: "大赛官助sasa",  content: "📌 重要时间节点：\n• 报名截止：5月10日 23:59\n• 初赛作品提交：5月20日 23:59\n• 决赛答辩：6月15日 线下", time: "14:21", self: false },
    { id: 5,  sender: "auto_thefience",content: "好嘟好嘟😘",              time: "14:25", self: false },
    { id: 6,  sender: "白芨",          content: "我用的腾讯送的混元大模型", time: "15:04", self: false },
    { id: 7,  sender: "Ashley",        content: "请问初赛是提交PPT还是Demo视频？两个都要吗", time: "15:30", self: false },
    { id: 8,  sender: "大赛官助小刘",  content: "@Ashley 都需要：1份产品PPT（不超过20页）+ 1段Demo视频（不超过5分钟），打包发到比赛邮箱", time: "15:32", self: false },
    { id: 9,  sender: "你",            content: "请问可以用第三方API吗？比如GPT-4之类的", time: "15:35", self: true },
    { id: 10, sender: "大赛官助sasa",  content: "@你 可以用，但是优先推荐使用腾讯混元，决赛答辩时若展示项目使用混元大模型有加分项哦～", time: "15:36", self: false },
    { id: 11, sender: "土豆片",        content: "我们队还差一个产品同学，有没有想加入的呀（产品方向）", time: "15:50", self: false },
    { id: 12, sender: "幻想国",        content: "+1 我们也缺个产品", time: "15:52", self: false },
    { id: 13, sender: "system",        content: "云上枫加入了群聊",          time: "15:08", self: false, isSystem: true, date: "4月25日 周五" },
    { id: 14, sender: "云上枫",        content: "大家好！请问这次比赛的评分维度有几个？", time: "15:10", self: false },
    { id: 15, sender: "大赛官助sasa",  content: "评分维度共5个：用户洞察与问题定义（20%）、产品方案设计（30%）、AI原生能力说明（25%）、落地可行性（15%）、创新差异化（10%）", time: "15:12", self: false },
    { id: 16, sender: "陈同学",        content: "请问可以个人参赛还是必须组队", time: "09:10", self: false, date: "今天" },
    { id: 17, sender: "大赛官助小刘",  content: "鼓励1-3人组队，也支持1人参赛，不过多人团队更有优势哦", time: "09:15", self: false },
    { id: 18, sender: "你",            content: "请问需要提交代码吗还是只要Demo就够了", time: "10:20", self: true },
    { id: 19, sender: "大赛官助sasa",  content: "@你 Demo可以是视频演示、交互原型或可运行代码，形式不限，能展示产品核心功能即可", time: "10:22", self: false },
    { id: 20, sender: "Lena_p",        content: "有没有做校园场景的同学，可以交流一下思路吗", time: "11:00", self: false },
    { id: 21, sender: "你",            content: "@Lena_p 我也是做校园方向的，可以加个好友", time: "11:05", self: true },
    { id: 22, sender: "system",        content: "Lena_p 请求添加你为好友",   time: "11:06", self: false, isSystem: true },
  ],

  // 2. 王老师课题组
  2: [
    { id: 1,  sender: "翁一士",       content: "今天王闯这边会把图纸出了给到你们 @😇 @Monica 周六师妹们辛苦一下 把这周做的片子除膜除了 正好教一下师妹怎么弄 然后明天弄完把片子都寄出到江西", time: "09:32", self: false, date: "4月25日 周五" },
    { id: 2,  sender: "Monica",        content: "收到",                    time: "09:35", self: false },
    { id: 3,  sender: "😇",            content: "除完直接装板子寄吗",      time: "09:40", self: false },
    { id: 4,  sender: "翁一士",        content: "之前有寄过来那种塑料的大板子\n可以放那个里面寄", time: "09:42", self: false },
    { id: 5,  sender: "😇",            content: "ok",                      time: "09:43", self: false },
    { id: 6,  sender: "翁一士",        content: "然后让快递好好包装",      time: "09:44", self: false },
    { id: 7,  sender: "王闯",          content: "下周三16:30开一次组会，请要展示的同学做好准备", time: "10:15", self: false },
    { id: 8,  sender: "MMMN",          content: "用大的没必要吧 小的好寄点 @Monica", time: "10:30", self: false },
    { id: 9,  sender: "Monica",        content: "可以\n六目 去过黄了 字写在背面 没有问题我就寄了", time: "10:35", self: false },
    { id: 10, sender: "王闯",          content: "OK 好的 辛苦了[强]\n寄了后 跟赵博说一声", time: "10:38", self: false },
    { id: 11, sender: "翁一士",        content: "这两天带师弟师妹们 @许雯俊 @😇 先用新的单面镀增透膜的玻璃做两目二维单绿的片子 王闯稍晚点会把溶液配方和图纸发给你们", time: "11:02", self: false },
    { id: 12, sender: "哩哩（刘黎黎）",content: "好的",                    time: "11:05", self: false },
    { id: 13, sender: "翁一士",        content: "@Yishi🦜 @王莉莉 @仲雪飞 三位老师好，五一期间，411/416/819/823有没有实验室要开展实验活动？学院要统计", time: "14:20", self: false, date: "4月27日 周日" },
    { id: 14, sender: "你",            content: "xitai的片子是同一天做的吗？曝光是一个同学吗 @哩哩（刘黎黎）", time: "15:00", self: true },
    { id: 15, sender: "哩哩（刘黎黎）",content: "不是同一天，有一半是一天做的，曝光是两个人，同一天仅一个人曝光", time: "15:08", self: false },
    { id: 16, sender: "你",            content: "横向周期设计的多少，有测过吗？\n单片光栅有色散，这边测了入出横向周期差10nm", time: "15:15", self: true },
    { id: 17, sender: "哩哩（刘黎黎）",content: "412nm的横向周期\n这边测过的", time: "15:20", self: false },
    { id: 18, sender: "你",            content: "入和出横向周期为什么会差啊？", time: "15:22", self: true },
    { id: 19, sender: "哩哩（刘黎黎）",content: "我也没想明白，有好有坏。另外下面的载具可以旋转0.5度，具体逆时针还是顺时针需要封一下看看。", time: "15:35", self: false },
    { id: 20, sender: "翁一士",        content: "新生我记得之前教过一个人封过，可以找他试试。", time: "15:42", self: false },
    { id: 21, sender: "你",            content: "👌",                       time: "15:45", self: true },
    { id: 22, sender: "翁一士",        content: "明日组会线上[旺柴][强]",   time: "16:20", self: false, date: "今天" },
    { id: 23, sender: "王闯",          content: "[旺柴][强]",               time: "16:21", self: false },
    { id: 24, sender: "MMMN",          content: "光阑是松的 动了光阑后 光斑位置变了\n。。。。。", time: "16:25", self: false },
    { id: 25, sender: "翁一士",        content: "翁一士 邀请您参加腾讯会议\n📞 会议主题：429组会\n🕐 会议时间：2026/04/29 16:30-19:30 (GMT+08:00)\n🔗 点击链接入会，或添加至会议列表", time: "16:32", self: false, atMe: true },
  ],

  // 3. 张师兄（私聊）
  3: [
    { id: 1,  sender: "张师兄",  content: "师弟最近实验咋样，出数据了吗",               time: "09:00", self: false, date: "4月24日 周四" },
    { id: 2,  sender: "你",      content: "还在跑数据，衍射效率这边有点低，不知道是不是曝光量的问题", time: "09:05", self: true },
    { id: 3,  sender: "张师兄",  content: "曝光量调多少了",                              time: "09:07", self: false },
    { id: 4,  sender: "你",      content: "150mJ/cm² 按之前的参数来的",                  time: "09:08", self: true },
    { id: 5,  sender: "张师兄",  content: "试试提到180，我上次这个参数效果更好",          time: "09:10", self: false },
    { id: 6,  sender: "你",      content: "好的，今天下午试试，谢谢师兄！",               time: "09:11", self: true },
    { id: 7,  sender: "张师兄",  content: "另外组会上翁老师说要讲彩色的进展，你那边彩色片子啥时候能出来", time: "14:30", self: false },
    { id: 8,  sender: "你",      content: "下周三之前应该能做完，就是不知道效果好不好", time: "14:32", self: true },
    { id: 9,  sender: "张师兄",  content: "先做出来再说，不好再迭代嘛",                  time: "14:34", self: false },
    { id: 10, sender: "你",      content: "嗯嗯，那组会要不要展示中间过程的数据",        time: "14:35", self: true },
    { id: 11, sender: "张师兄",  content: "展示一下吧，翁老师喜欢看过程，不是只看结果",  time: "14:36", self: false },
    { id: 12, sender: "你",      content: "ok收到！",                                    time: "14:37", self: true },
    { id: 13, sender: "张师兄",  content: "对了你用的是哪个型号的全息材料",              time: "16:00", self: false, date: "今天" },
    { id: 14, sender: "你",      content: "Bayfol HX 200，不是特别好但实验室就这个",     time: "16:02", self: true },
    { id: 15, sender: "张师兄",  content: "在吗师弟，最近实验进展怎么样",                time: "09:15", self: false },
    { id: 16, sender: "你",      content: "在的师兄！上周做的两组样品已经测完，结果还行，但是横向周期偏差有点大", time: "09:20", self: true },
    { id: 17, sender: "张师兄",  content: "偏差多少",                                    time: "09:21", self: false },
    { id: 18, sender: "你",      content: "10nm左右，比预期大",                          time: "09:22", self: true },
    { id: 19, sender: "张师兄",  content: "嗯，可能是曝光那边的问题，下次可以试试调一下载具角度", time: "09:30", self: false },
    { id: 20, sender: "张师兄",  content: "对了下午的图纸我整理一下，3点前发你",         time: "14:10", self: false },
    { id: 21, sender: "你",      content: "好嘞！师兄辛苦",                               time: "14:11", self: true },
    { id: 22, sender: "张师兄",  content: "图纸我下午发你",                               time: "15:42", self: false },
  ],

  // 4. 计算机网络课程群
  4: [
    { id: 1,  sender: "张老师",     content: "同学们晚上好，本周的课程内容是TCP/UDP协议详解，预习材料已上传至学习通", time: "20:15", self: false, date: "4月22日 周二" },
    { id: 2,  sender: "王同学",     content: "老师，课件可以发PDF版的吗？PPT在我ipad上打不开", time: "20:30", self: false },
    { id: 3,  sender: "张老师",     content: "好的，我转成PDF再上传一份",               time: "20:35", self: false },
    { id: 4,  sender: "助教 陈学长",content: "📌 第三章作业已发布：\n1. 完成课后习题3.1-3.8\n2. 编程题：实现简易TCP三次握手模拟\n3. 提交格式：word + 代码压缩包\n4. 截止时间：5月9日 23:59", time: "10:00", self: false, date: "4月25日 周五" },
    { id: 5,  sender: "你",         content: "@助教 陈学长 请问编程题用Python还是C都可以吗", time: "10:30", self: true },
    { id: 6,  sender: "助教 陈学长",content: "@你 都可以，附上简要的注释和运行截图就行", time: "10:32", self: false },
    { id: 7,  sender: "李同学",     content: "请问DDL会延期吗，五一假期写不完啊😭",    time: "11:00", self: false },
    { id: 8,  sender: "助教 陈学长",content: "DDL不延期哦，五一前可以提前写",           time: "11:05", self: false },
    { id: 9,  sender: "赵同学",     content: "请问编程题要不要测试用例截图",             time: "11:20", self: false },
    { id: 10, sender: "助教 陈学长",content: "需要！要展示三次握手的完整过程输出",      time: "11:22", self: false },
    { id: 11, sender: "孙同学",     content: "作业字数统计包含代码吗",                  time: "11:40", self: false },
    { id: 12, sender: "助教 陈学长",content: "不包含，3000字是正文",                   time: "11:42", self: false },
    { id: 13, sender: "张老师",     content: "📢 重要通知：本周四（4月30日）下午的课调到 教三-204，时间不变下午14:00开始", time: "14:00", self: false, date: "4月28日 周一" },
    { id: 14, sender: "陈同学",     content: "收到老师！",                               time: "14:02", self: false },
    { id: 15, sender: "你",         content: "收到",                                    time: "14:05", self: true },
    { id: 16, sender: "王同学",     content: "老师教三-204在哪个楼",                    time: "14:10", self: false },
    { id: 17, sender: "张老师",     content: "教学三号楼，和上次上课那栋一样，就是换了房间号", time: "14:12", self: false },
    { id: 18, sender: "张老师",     content: "再次提醒：第三章课后作业本周五（5月9日）23:59前提交，word格式，不少于3000字，发到课程邮箱，并同步提交到学习通平台", time: "14:20", self: false, date: "今天" },
    { id: 19, sender: "助教 陈学长",content: "补充：不接受补交，请大家务必提前完成",    time: "14:22", self: false },
    { id: 20, sender: "钱同学",     content: "老师，学习通是提交word还是pdf",            time: "14:25", self: false },
    { id: 21, sender: "张老师",     content: "@钱同学 word即可，不用再转pdf",            time: "14:26", self: false },
    { id: 22, sender: "周同学",     content: "感谢老师！",                               time: "14:27", self: false },
  ],

  // 5. 数据结构
  5: [
    { id: 1,  sender: "李老师",     content: "🌟 本周实验：实现红黑树的插入、删除与查找操作", time: "08:30", self: false, date: "4月21日 周一" },
    { id: 2,  sender: "李老师",     content: "实验报告模板已上传，请大家下载使用",          time: "08:31", self: false },
    { id: 3,  sender: "助教",       content: "[文件] 实验报告模板.docx",                   time: "08:32", self: false },
    { id: 4,  sender: "刘同学",     content: "老师，红黑树的旋转操作可以画图说明吗？",      time: "10:15", self: false },
    { id: 5,  sender: "李老师",     content: "可以，建议使用draw.io或者手绘扫描",           time: "10:20", self: false },
    { id: 6,  sender: "你",         content: "实验DDL是哪天？",                             time: "11:00", self: true },
    { id: 7,  sender: "助教",       content: "@你 5月15日24点",                             time: "11:05", self: false },
    { id: 8,  sender: "黄同学",     content: "请问是要手写代码还是可以借助IDE",              time: "11:30", self: false },
    { id: 9,  sender: "助教",       content: "IDE可以用，但代码要自己写不能抄",              time: "11:32", self: false },
    { id: 10, sender: "刘同学",     content: "C++还是Java写，或者都可以",                   time: "13:00", self: false },
    { id: 11, sender: "李老师",     content: "不限语言，但要和报告说明一致",                time: "13:05", self: false },
    { id: 12, sender: "你",         content: "老师删除操作如果涉及双黑修复，需要写详细推导过程吗", time: "13:20", self: true },
    { id: 13, sender: "李老师",     content: "@你 写关键步骤就行，不用全部列出来，结合代码注释即可", time: "13:22", self: false },
    { id: 14, sender: "宋同学",     content: "复杂度分析必须写吗",                          time: "14:00", self: false },
    { id: 15, sender: "助教",       content: "要写，时间复杂度和空间复杂度都要分析",        time: "14:02", self: false },
    { id: 16, sender: "你",         content: "感谢助教！",                                  time: "14:03", self: true },
    { id: 17, sender: "吴同学",     content: "老师上课讲的那个AVL树代码可以复用吗",         time: "15:00", self: false },
    { id: 18, sender: "李老师",     content: "不行，这次是红黑树，需要独立实现",            time: "15:02", self: false },
    { id: 19, sender: "周同学",     content: "[图片]",                                      time: "11:08", self: false, date: "今天" },
    { id: 20, sender: "周同学",     content: "我画的红黑树插入流程图，有不对的地方请大佬们指正🤝", time: "11:09", self: false },
    { id: 21, sender: "林同学",     content: "我觉得第3步应该先检查叔父节点颜色",           time: "11:15", self: false },
    { id: 22, sender: "周同学",     content: "你说得对！我改一下😭",                        time: "11:16", self: false },
  ],

  // 6. 操作系统课程群
  6: [
    { id: 1,  sender: "王教授",     content: "同学们好，本周课程重点：进程调度算法（FCFS、SJF、RR）",  time: "08:00", self: false, date: "4月21日 周一" },
    { id: 2,  sender: "王教授",     content: "课件已挂在课程网站，实验2截止：下周五",      time: "08:02", self: false },
    { id: 3,  sender: "助教",       content: "补充一下实验2的提交要求：\n• 实验报告（PDF）\n• 代码（zip打包）\n• 截图（关键步骤）", time: "08:30", self: false },
    { id: 4,  sender: "叶同学",     content: "老师实验用Linux还是Windows环境",             time: "10:00", self: false },
    { id: 5,  sender: "助教",       content: "推荐Linux，在虚拟机里做就行",               time: "10:02", self: false },
    { id: 6,  sender: "你",         content: "实验2能用Python模拟吗还是要C语言",           time: "10:10", self: true },
    { id: 7,  sender: "助教",       content: "@你 Python可以，但要注意系统调用部分的模拟方式", time: "10:12", self: false },
    { id: 8,  sender: "黄同学",     content: "实验报告有没有字数要求",                     time: "10:30", self: false },
    { id: 9,  sender: "助教",       content: "没有强制字数，但思路分析要写清楚",           time: "10:32", self: false },
    { id: 10, sender: "王教授",     content: "实验3报告模板已上传到课程网站，注意本次实验需要现场答辩", time: "16:20", self: false, date: "昨天" },
    { id: 11, sender: "刘同学",     content: "答辩什么时候",                               time: "16:25", self: false },
    { id: 12, sender: "助教",       content: "下周三（5月7日）下午14:00-17:00，机房405",   time: "16:30", self: false },
    { id: 13, sender: "你",         content: "好的",                                        time: "16:32", self: true },
    { id: 14, sender: "陈同学",     content: "答辩需要PPT吗",                              time: "16:40", self: false },
    { id: 15, sender: "助教",       content: "要的，5分钟汇报+5分钟提问",                  time: "16:42", self: false },
    { id: 16, sender: "唐同学",     content: "一个人答辩还是小组",                         time: "16:50", self: false },
    { id: 17, sender: "助教",       content: "个人作业，个人答辩",                         time: "16:52", self: false },
    { id: 18, sender: "邓同学",     content: "老师实验3那个内存分配的题我还没看懂，有没有参考资料", time: "20:00", self: false },
    { id: 19, sender: "助教",       content: "我发个参考链接，OS三大内存分配算法：首次适配、最佳适配、最差适配", time: "20:10", self: false },
    { id: 20, sender: "你",         content: "感谢助教！收藏了",                            time: "20:12", self: true },
    { id: 21, sender: "张同学",     content: "提问，实验3跑出来内存碎片率很高正常吗",       time: "20:30", self: false },
    { id: 22, sender: "助教",       content: "这个正常的，主要看你的算法实现对不对",        time: "20:32", self: false },
  ],

  // 7. 班级群
  7: [
    { id: 1,  sender: "班长 李同学", content: "大家好，关于本学期末的班级毕业旅行，想先摸一下底，大概有多少人有意愿参加", time: "09:00", self: false, date: "4月24日 周四" },
    { id: 2,  sender: "吴同学",      content: "我参加！去哪里呀",                         time: "09:05", self: false },
    { id: 3,  sender: "你",          content: "我也感兴趣，时间定了吗",                   time: "09:07", self: true },
    { id: 4,  sender: "班长 李同学", content: "还没定，先看看人数，30人以上才比较划算，大家帮忙统计一下", time: "09:10", self: false },
    { id: 5,  sender: "赵同学",      content: "1",                                         time: "09:15", self: false },
    { id: 6,  sender: "钱同学",      content: "2，去厦门吧",                               time: "09:16", self: false },
    { id: 7,  sender: "孙同学",      content: "3，赞成厦门+1",                             time: "09:17", self: false },
    { id: 8,  sender: "你",          content: "4",                                          time: "09:18", self: true },
    { id: 9,  sender: "周同学",      content: "5，票价有点贵但可以接受",                   time: "09:20", self: false },
    { id: 10, sender: "郑同学",      content: "6，我本来就是厦门的哈哈哈，可以当导游",     time: "09:21", self: false },
    { id: 11, sender: "班长 李同学", content: "哈哈哈那太好了！我来整理一下名单",          time: "09:22", self: false },
    { id: 12, sender: "王同学",      content: "老师知道了吗，需要审批吗",                  time: "09:25", self: false },
    { id: 13, sender: "班长 李同学", content: "这是同学自发活动，不需要审批，但会跟辅导员说一声", time: "09:27", self: false },
    { id: 14, sender: "班长 李同学", content: "📢【班费收缴通知】\n各位同学，本学期班费每人150元，用于:\n• 班级活动经费\n• 毕业纪念品\n• 节日生日福利\n请于5月15日前转账到我的支付宝（截图发我）", time: "10:30", self: false, date: "今天" },
    { id: 15, sender: "你",          content: "好的，下午就转",                             time: "10:35", self: true },
    { id: 16, sender: "王同学",      content: "收到👌",                                    time: "10:38", self: false },
    { id: 17, sender: "陈同学",      content: "支付宝账号多少",                             time: "10:39", self: false },
    { id: 18, sender: "班长 李同学", content: "发你私聊了",                                 time: "10:40", self: false },
    { id: 19, sender: "班长 李同学", content: "另外咱们班团建定在5月18日（周日），地点紫金山徒步+晚饭，去的同学接龙一下！", time: "10:45", self: false },
    { id: 20, sender: "陈同学",      content: "1. 陈\n2. 王\n3. 你",                        time: "10:50", self: false },
    { id: 21, sender: "吴同学",      content: "4. 吴，上次没去，这次一定去",                time: "10:52", self: false },
    { id: 22, sender: "林同学",      content: "5. 林",                                      time: "10:53", self: false },
  ],

  // 8. 学院毕业群
  8: [
    { id: 1,  sender: "学院辅导员",  content: "各位同学，毕业前的各项流程请认真对待，下面发一份时间节点汇总，请大家收藏", time: "09:00", self: false, date: "4月20日 周日" },
    { id: 2,  sender: "学院辅导员",  content: "📅 毕业时间节点汇总：\n• 5/1-5/10 毕业生档案核查\n• 5/10-5/20 论文初稿提交\n• 5/20-5/25 导师评阅\n• 5/25-6/10 盲审\n• 6/15-6/18 答辩\n• 6/25 学位评定", time: "09:02", self: false },
    { id: 3,  sender: "唐同学",      content: "请问学位服在哪里领",                         time: "09:30", self: false },
    { id: 4,  sender: "学院辅导员",  content: "6月10日之后统一在学院楼下领，会通知具体时间", time: "09:32", self: false },
    { id: 5,  sender: "邓同学",      content: "如果盲审没过会怎样",                         time: "10:00", self: false },
    { id: 6,  sender: "学院辅导员",  content: "盲审结果分为：优秀/良好/合格/不合格，不合格需修改后重新送审，会影响答辩时间", time: "10:02", self: false },
    { id: 7,  sender: "你",          content: "请问论文字数有没有下限",                     time: "10:10", self: true },
    { id: 8,  sender: "学院辅导员",  content: "@你 本科论文一般不少于1.5万字，研究生不少于3万字，具体以各专业要求为准", time: "10:12", self: false },
    { id: 9,  sender: "沈同学",      content: "导师评阅和盲审是同时进行吗",                 time: "11:00", self: false },
    { id: 10, sender: "学院辅导员",  content: "不是同时，导师先评再送盲审",                 time: "11:02", self: false },
    { id: 11, sender: "韩同学",      content: "毕业典礼什么时候",                           time: "14:00", self: false },
    { id: 12, sender: "学院辅导员",  content: "暂定6月28日，具体日期以学校公告为准",        time: "14:05", self: false },
    { id: 13, sender: "教务老师",    content: "【毕业论文盲审说明】\n各位2026届的同学：\n1. 论文初稿提交截止：5月20日\n2. 盲审起止：5月25日 - 6月10日\n3. 答辩时间：6月15-18日\n请大家按时提交，逾期视为放弃答辩资格", time: "16:00", self: false, date: "昨天" },
    { id: 14, sender: "学院辅导员",  content: "另外提醒下，毕业生离校手续清单已发到各班群，请尽早办理", time: "16:30", self: false },
    { id: 15, sender: "冯同学",      content: "档案可以不回原籍吗",                         time: "17:00", self: false },
    { id: 16, sender: "学院辅导员",  content: "可以留在就业地，到就业单位的人事部门，具体填在档案去向一栏", time: "17:02", self: false },
    { id: 17, sender: "你",          content: "档案不找工作就先挂在哪里",                   time: "17:05", self: true },
    { id: 18, sender: "学院辅导员",  content: "@你 可以挂在户籍所在地的人才交流中心，或者学校提供的档案托管服务", time: "17:07", self: false },
    { id: 19, sender: "卫同学",      content: "谢谢老师解答！",                              time: "17:10", self: false },
    { id: 20, sender: "褚同学",      content: "请问答辩完还要等多久拿学位证",               time: "18:00", self: false },
    { id: 21, sender: "教务老师",    content: "答辩通过后约1-2个月，7月底前会发",           time: "18:05", self: false },
    { id: 22, sender: "季同学",      content: "收到！感谢老师们",                            time: "18:06", self: false },
  ],

  // 9. Team Phoenix 创新创业大赛
  9: [
    { id: 1,  sender: "队友 王",     content: "大家好，先确认一下分工，我负责市场调研和商业模式", time: "10:00", self: false, date: "4月24日 周四" },
    { id: 2,  sender: "队友 周",     content: "我做技术方案和架构图",                       time: "10:05", self: false },
    { id: 3,  sender: "你",          content: "我来做产品设计和PPT视觉",                    time: "10:07", self: true },
    { id: 4,  sender: "队友 刘",     content: "我写用户调研和竞品分析",                     time: "10:09", self: false },
    { id: 5,  sender: "队友 王",     content: "好！那周三晚上开个线上会对齐进度，怎么样",   time: "10:10", self: false },
    { id: 6,  sender: "你",          content: "没问题",                                      time: "10:11", self: true },
    { id: 7,  sender: "队友 周",     content: "我周三晚上有课，能不能改周四",               time: "10:12", self: false },
    { id: 8,  sender: "队友 王",     content: "没问题，周四晚8点，腾讯会议",               time: "10:13", self: false },
    { id: 9,  sender: "队友 刘",     content: "我发现一个竞品做得不错，等会截图发群里参考下", time: "11:30", self: false },
    { id: 10, sender: "队友 刘",     content: "[图片] 竞品界面截图",                         time: "11:31", self: false },
    { id: 11, sender: "你",          content: "他家这个排版不错，可以参考风格",              time: "11:35", self: true },
    { id: 12, sender: "队友 王",     content: "对对对，但我们差异化要体现出来，不要做得一样", time: "11:37", self: false },
    { id: 13, sender: "你",          content: "我把PPT v3发群里了，大家看看",               time: "11:20", self: true, date: "今天" },
    { id: 14, sender: "你",          content: "[文件] Team Phoenix_产品方案_v3.pptx",        time: "11:21", self: true },
    { id: 15, sender: "队友 王",     content: "我看了，第8页商业模式那块有点单薄",          time: "11:35", self: false },
    { id: 16, sender: "队友 刘",     content: "+1 还有用户画像可以再具体点",               time: "11:40", self: false },
    { id: 17, sender: "你",          content: "好，我再补充一下，今晚改完发新版",           time: "11:45", self: true },
    { id: 18, sender: "队友 周",     content: "提醒大家：初赛截止5月6日23:59，下周一前要把所有材料定稿！", time: "13:00", self: false },
    { id: 19, sender: "队友 周",     content: "@全体成员 ⏰ 还剩 5 天",                      time: "13:01", self: false, atMe: true },
    { id: 20, sender: "你",          content: "收到，加油！",                               time: "13:22", self: true },
    { id: 21, sender: "队友 王",     content: "加油！我今晚把商业模式那页补充好发给你",    time: "13:25", self: false },
    { id: 22, sender: "队友 刘",     content: "用户调研数据我再多找几个样本，周五发给你",   time: "13:28", self: false },
  ],

  // 10. 刘正昂（私聊）
  10: [
    { id: 1,  sender: "刘正昂",      content: "哥们，今天组会的PPT你更新了吗",              time: "09:00", self: false, date: "4月24日 周四" },
    { id: 2,  sender: "你",          content: "更新了，把第五页数据改了一下，你看看",        time: "09:05", self: true },
    { id: 3,  sender: "刘正昂",      content: "ok，我加了几个用户调研数据进去，你待会合并一下", time: "09:10", self: false },
    { id: 4,  sender: "你",          content: "行，你发给我",                               time: "09:11", self: true },
    { id: 5,  sender: "刘正昂",      content: "[文件] 用户调研补充数据.xlsx",               time: "09:12", self: false },
    { id: 6,  sender: "你",          content: "收到！",                                     time: "09:13", self: true },
    { id: 7,  sender: "刘正昂",      content: "商业模式那页你觉得怎么改比较好",             time: "14:00", self: false },
    { id: 8,  sender: "你",          content: "我觉得可以加个盈利预测的数字，显得更有说服力", time: "14:03", self: true },
    { id: 9,  sender: "刘正昂",      content: "对，但数字怎么估算，感觉不太好写",           time: "14:05", self: false },
    { id: 10, sender: "你",          content: "可以参考同类产品的数据，先做个保守估计",      time: "14:07", self: true },
    { id: 11, sender: "刘正昂",      content: "ok我来找数据，你先改视觉那块",               time: "14:09", self: false },
    { id: 12, sender: "你",          content: "没问题，我今晚改好发你",                     time: "14:10", self: true },
    { id: 13, sender: "刘正昂",      content: "兄弟在不",                                   time: "23:30", self: false, date: "昨天" },
    { id: 14, sender: "刘正昂",      content: "PPT那个用户调研图我加了几个数据",            time: "23:35", self: false },
    { id: 15, sender: "刘正昂",      content: "[图片]",                                     time: "01:48", self: false },
    { id: 16, sender: "你",          content: "明天看，先睡了😪",                           time: "06:50", self: true, date: "今天" },
    { id: 17, sender: "刘正昂",      content: "哈哈哈好，我也刚睡",                         time: "07:00", self: false },
    { id: 18, sender: "你",          content: "你昨晚干到几点的",                           time: "08:30", self: true },
    { id: 19, sender: "刘正昂",      content: "2点多，商业模式写得有点上头",               time: "08:35", self: false },
    { id: 20, sender: "你",          content: "注意身体啊，这两天别熬太狠，后面还要准备答辩", time: "08:36", self: true },
    { id: 21, sender: "刘正昂",      content: "好的，今晚早点睡，你那边v4啥时候出",         time: "09:00", self: false },
    { id: 22, sender: "你",          content: "争取今天下午，你先把你的部分发我",           time: "09:02", self: true },
  ],

  // 11. 摄影社
  11: [
    { id: 1,  sender: "社长小明",    content: "大家好！本学期第一次外拍活动定在下周六，报名的同学接龙", time: "20:00", self: false, date: "4月20日 周日" },
    { id: 2,  sender: "社员小张",    content: "1. 张",                                      time: "20:05", self: false },
    { id: 3,  sender: "社员小红",    content: "2. 红",                                      time: "20:06", self: false },
    { id: 4,  sender: "你",          content: "3. 我",                                      time: "20:07", self: true },
    { id: 5,  sender: "社员小林",    content: "4. 林，期待！",                              time: "20:08", self: false },
    { id: 6,  sender: "社长小明",    content: "好的，已经有8个人报名，初定玄武湖，记得带长焦", time: "20:10", self: false },
    { id: 7,  sender: "社员小张",    content: "要带三脚架吗",                               time: "20:12", self: false },
    { id: 8,  sender: "社长小明",    content: "看个人，不是必须的，机动摄影更多一些",       time: "20:14", self: false },
    { id: 9,  sender: "你",          content: "集合时间和地点定了吗",                       time: "20:15", self: true },
    { id: 10, sender: "社长小明",    content: "@你 下午2点，玄武湖公园正门，地铁玄武门站C出口集合", time: "20:16", self: false },
    { id: 11, sender: "你",          content: "收到👍",                                    time: "20:17", self: true },
    { id: 12, sender: "社长小明",    content: "周六外拍活动改到下午3点，地点不变还是玄武湖", time: "15:20", self: false, date: "昨天" },
    { id: 13, sender: "你",          content: "收到！",                                    time: "15:22", self: true },
    { id: 14, sender: "社员小林",    content: "为什么推迟了",                               time: "15:24", self: false },
    { id: 15, sender: "社长小明",    content: "有个成员上午有课，整体推迟一小时",           time: "15:26", self: false },
    { id: 16, sender: "社长小明",    content: "对了，周六外拍地点也改了，改到情人谷，人少一点风景好。集合地点：地铁2号线下马坊站A出口 14:30", time: "19:45", self: false },
    { id: 17, sender: "社员小张",    content: "👍",                                         time: "19:46", self: false },
    { id: 18, sender: "你",          content: "好的",                                       time: "19:50", self: true },
    { id: 19, sender: "社员小红",    content: "情人谷在哪，我没去过",                        time: "19:52", self: false },
    { id: 20, sender: "社长小明",    content: "就在东郊，离市区不远，很出片！",              time: "19:54", self: false },
    { id: 21, sender: "社员小张",    content: "上次拍的照片有没有人出修图版，我的手机直出不太行", time: "20:00", self: false },
    { id: 22, sender: "你",          content: "我晚点修几张发你们",                         time: "20:02", self: true },
  ],

  // 12. 学生会
  12: [
    { id: 1,  sender: "宣传部长",    content: "各位，五月份咱们部门有三场活动，今天先开个预备会", time: "09:00", self: false, date: "4月20日 周日" },
    { id: 2,  sender: "宣传部长",    content: "三场活动：\n• 5/10 校园歌手大赛\n• 5/18 创新创业讲座\n• 5/25 毕业生晚会\n每场至少需要2人负责宣传物料和现场记录", time: "09:02", self: false },
    { id: 3,  sender: "陆同学",      content: "我可以认领5/10校园歌手",                    time: "09:10", self: false },
    { id: 4,  sender: "伍同学",      content: "我认领5/25毕业晚会",                        time: "09:11", self: false },
    { id: 5,  sender: "你",          content: "我可以协助5/18讲座",                        time: "09:12", self: true },
    { id: 6,  sender: "宣传部长",    content: "很好，5/18讲座还差一个人，@你 你找个搭档一起", time: "09:14", self: false },
    { id: 7,  sender: "钱同学",      content: "我和他搭档",                                 time: "09:15", self: false },
    { id: 8,  sender: "宣传部长",    content: "好！那分工是：宣传海报提前1周出，当天负责摄影+推文", time: "09:17", self: false },
    { id: 9,  sender: "你",          content: "海报我来做，摄影钱同学负责？",               time: "09:18", self: true },
    { id: 10, sender: "钱同学",      content: "可以，我来",                                 time: "09:19", self: false },
    { id: 11, sender: "宣传部长",    content: "那就定了，各自的任务写进飞书，方便后续追踪进度", time: "09:21", self: false },
    { id: 12, sender: "陆同学",      content: "5/10校园歌手的主视觉风格有要求吗",           time: "10:00", self: false },
    { id: 13, sender: "宣传部长",    content: '今年主题是"星光舞台"，视觉走黑金风格，之前的VI规范在群文件里', time: "10:03", self: false },
    { id: 14, sender: "宣传部长",    content: "[文件] 5月活动排期.xlsx",                   time: "10:00", self: false, date: "周一" },
    { id: 15, sender: "宣传部长",    content: "5月有3场活动需要宣传组的同学：\n• 5/10 校园歌手大赛\n• 5/18 创新创业讲座\n• 5/25 毕业生晚会\n大家自愿认领，发我私聊", time: "10:05", self: false },
    { id: 16, sender: "伍同学",      content: "收到！",                                    time: "10:08", self: false },
    { id: 17, sender: "你",          content: "好的，我私聊你确认一下",                    time: "10:09", self: true },
    { id: 18, sender: "邬同学",      content: "毕业晚会场地定了吗，去年在礼堂",            time: "10:15", self: false },
    { id: 19, sender: "宣传部长",    content: "还在申请，应该也是礼堂，等确认通知",        time: "10:17", self: false },
    { id: 20, sender: "翟同学",      content: "讲座的嘉宾有没有确定",                      time: "10:30", self: false },
    { id: 21, sender: "宣传部长",    content: "请到了一位创业公司CEO，具体信息下周公布",    time: "10:32", self: false },
    { id: 22, sender: "你",          content: "期待！",                                    time: "10:33", self: true },
  ],

  // 13. 小美（私聊）
  13: [
    { id: 1,  sender: "小美",        content: "在吗在吗！下周末有空不",                    time: "10:00", self: false, date: "4月26日 周六" },
    { id: 2,  sender: "你",          content: "在！干啥",                                  time: "10:05", self: true },
    { id: 3,  sender: "小美",        content: "组个出游呀，叫上小红，我们三个好久没出来玩了", time: "10:08", self: false },
    { id: 4,  sender: "你",          content: "好啊好啊，去哪？",                          time: "10:10", self: true },
    { id: 5,  sender: "小美",        content: "我也没想好，玄武湖？中山陵？",              time: "10:12", self: false },
    { id: 6,  sender: "你",          content: "中山陵吧，没去过",                          time: "10:15", self: true },
    { id: 7,  sender: "小美",        content: "行！我问下小红",                            time: "10:18", self: false },
    { id: 8,  sender: "小美",        content: "小红说可以，你订好地铁时间发我",            time: "10:30", self: false },
    { id: 9,  sender: "你",          content: "好的，下午坐到哪站，你查一下",              time: "10:32", self: true },
    { id: 10, sender: "小美",        content: "地铁2号线中山陵站下，走路15分钟，建议2点前出发", time: "10:35", self: false },
    { id: 11, sender: "你",          content: "那我们12:30左右出发？",                    time: "10:37", self: true },
    { id: 12, sender: "小美",        content: "我12点才下课，12:30出发太紧了",             time: "10:39", self: false },
    { id: 13, sender: "你",          content: "那1点出发，2点到景区门口",                  time: "10:40", self: true },
    { id: 14, sender: "小美",        content: "好！就这么定了，我跟小红说",               time: "10:41", self: false },
    { id: 15, sender: "小美",        content: "周末出游定了吗？我周六下午有空",            time: "11:30", self: false, date: "今天" },
    { id: 16, sender: "小红",        content: "我周六上午有课，下午可以",                  time: "11:32", self: false },
    { id: 17, sender: "你",          content: "那就周六下午？去哪？",                      time: "11:33", self: true },
    { id: 18, sender: "小美",        content: "不是说好中山陵了吗哈哈哈",                  time: "11:35", self: false },
    { id: 19, sender: "你",          content: "对对对忘了😅",                             time: "11:36", self: true },
    { id: 20, sender: "你",          content: "下午2点地铁站集合？",                       time: "11:37", self: true },
    { id: 21, sender: "小美",        content: "👍 中山陵下午2点见",                        time: "11:38", self: false },
    { id: 22, sender: "小红",        content: "好的",                                       time: "11:38", self: false },
  ],

  // 14. 班长（私聊）
  14: [
    { id: 1,  sender: "班长 李同学", content: "兄弟，毕业旅行你报名了吗",                  time: "09:00", self: false, date: "4月24日 周四" },
    { id: 2,  sender: "你",          content: "报了！在群里接龙了",                        time: "09:05", self: true },
    { id: 3,  sender: "班长 李同学", content: "ok好，人数差不多了，可能去厦门，你有没有时间出发前先定好宿舍", time: "09:07", self: false },
    { id: 4,  sender: "你",          content: "答辩完了应该就可以，大概6月底",             time: "09:09", self: true },
    { id: 5,  sender: "班长 李同学", content: "好，那毕业典礼之后出发，6月28-7月1，4天3夜", time: "09:11", self: false },
    { id: 6,  sender: "你",          content: "可以，我标注一下",                          time: "09:12", self: true },
    { id: 7,  sender: "班长 李同学", content: "另外咱们班有没有同学会摄影的，毕业旅行想留下好一点的照片", time: "09:20", self: false },
    { id: 8,  sender: "你",          content: "我在摄影社，会一点，可以帮忙拍",            time: "09:22", self: true },
    { id: 9,  sender: "班长 李同学", content: "太好了！那就靠你了！带上你的相机哈哈哈",    time: "09:23", self: false },
    { id: 10, sender: "你",          content: "没问题！",                                  time: "09:24", self: true },
    { id: 11, sender: "班长 李同学", content: "哦对，你是摄影社的，这次社团外拍你去吗",   time: "09:25", self: false },
    { id: 12, sender: "你",          content: "去的，周六下午去情人谷",                   time: "09:26", self: true },
    { id: 13, sender: "班长 李同学", content: "哦哈哈，你比我还忙",                        time: "09:27", self: false },
    { id: 14, sender: "班长 李同学", content: "兄弟，班费150记得交一下",                   time: "10:50", self: false, date: "今天" },
    { id: 15, sender: "班长 李同学", content: "另外团建你去吗？要的话给你登记一下",        time: "10:51", self: false },
    { id: 16, sender: "你",          content: "班费今天转！团建我去",                      time: "10:55", self: true },
    { id: 17, sender: "班长 李同学", content: "收到，帮你登记了",                          time: "10:56", self: false },
    { id: 18, sender: "你",          content: "谢谢！紫金山是全天活动还是半天",            time: "10:57", self: true },
    { id: 19, sender: "班长 李同学", content: "全天，上午爬山下午休息，晚上集体吃饭，准备好穿舒服的鞋", time: "10:58", self: false },
    { id: 20, sender: "你",          content: "明白！",                                    time: "10:59", self: true },
    { id: 21, sender: "班长 李同学", content: "另外下周一早上有个辅导员要求的班会，9点，记得来", time: "11:00", self: false },
    { id: 22, sender: "你",          content: "好的，我记下来了",                          time: "11:01", self: true },
  ],

  // 15. 妈妈（私聊）
  15: [
    { id: 1,  sender: "妈妈",        content: "孩子在忙什么呢",                             time: "10:00", self: false, date: "4月22日 周二" },
    { id: 2,  sender: "你",          content: "在写作业，最近有点多",                       time: "10:05", self: true },
    { id: 3,  sender: "妈妈",        content: "注意休息，别熬太晚",                         time: "10:07", self: false },
    { id: 4,  sender: "你",          content: "知道了妈，你们在家都好吧",                   time: "10:08", self: true },
    { id: 5,  sender: "妈妈",        content: "好好的，你爸前天去钓鱼了，钓了好多，让我冻起来等你回来吃", time: "10:09", self: false },
    { id: 6,  sender: "你",          content: "哈哈好，那我放假回去",                       time: "10:10", self: true },
    { id: 7,  sender: "妈妈",        content: "五一假期回来吗",                             time: "10:11", self: false },
    { id: 8,  sender: "你",          content: "五一可能回不去，有个比赛要准备，六月毕业前回", time: "10:13", self: true },
    { id: 9,  sender: "妈妈",        content: "哦那算了，好好备赛，妈不急",                 time: "10:15", self: false },
    { id: 10, sender: "你",          content: "嗯嗯，妈你最好了",                           time: "10:16", self: true },
    { id: 11, sender: "妈妈",        content: "哈哈，馋我红烧肉了吧",                       time: "10:17", self: false },
    { id: 12, sender: "你",          content: "想！馋了😂",                                time: "10:18", self: true },
    { id: 13, sender: "妈妈",        content: "孩子，妈给你寄了点家里的腊肉，明后天到",     time: "18:30", self: false, date: "昨天" },
    { id: 14, sender: "你",          content: "好嘞！谢谢妈",                               time: "18:35", self: true },
    { id: 15, sender: "妈妈",        content: "记得吃饭啊孩子，别老吃外卖",                 time: "21:00", self: false },
    { id: 16, sender: "你",          content: "妈我吃的，你放心",                           time: "21:05", self: true },
    { id: 17, sender: "妈妈",        content: "今天吃什么了",                               time: "21:06", self: false },
    { id: 18, sender: "你",          content: "下午食堂吃的黄焖鸡，挺好的",                 time: "21:08", self: true },
    { id: 19, sender: "妈妈",        content: "那不错，多吃蔬菜",                           time: "21:09", self: false },
    { id: 20, sender: "你",          content: "嗯嗯！妈你早点睡",                           time: "21:10", self: true },
    { id: 21, sender: "妈妈",        content: "好，你也早点睡，明天还有课",                 time: "21:11", self: false },
    { id: 22, sender: "你",          content: "好的妈，晚安！",                              time: "21:12", self: true },
  ],

  // 16. 摆烂群
  16: [
    { id: 1,  sender: "宿舍老二",    content: "今天谁去图书馆的",                           time: "08:00", self: false, date: "4月26日 周六" },
    { id: 2,  sender: "宿舍老三",    content: "没有，我摸鱼一天",                           time: "08:05", self: false },
    { id: 3,  sender: "你",          content: "我本来要去，起晚了",                         time: "08:06", self: true },
    { id: 4,  sender: "宿舍老四",    content: "我说今天去，结果在床上刷了三个小时B站",      time: "08:08", self: false },
    { id: 5,  sender: "宿舍老二",    content: "哈哈哈这就是当代大学生",                     time: "08:09", self: false },
    { id: 6,  sender: "你",          content: "哎对了，毕业论文写了多少",                   time: "10:00", self: true },
    { id: 7,  sender: "宿舍老三",    content: "3000字，离1.5万字还差一个小目标",            time: "10:02", self: false },
    { id: 8,  sender: "宿舍老四",    content: "我已经写完了……字数",                         time: "10:03", self: false },
    { id: 9,  sender: "宿舍老三",    content: "你是神吗",                                   time: "10:04", self: false },
    { id: 10, sender: "宿舍老四",    content: "我是指凑字数凑完了，内容……还差得远",          time: "10:05", self: false },
    { id: 11, sender: "你",          content: "哈哈哈哈哈哈我也是凑字数高手",               time: "10:06", self: true },
    { id: 12, sender: "宿舍老二",    content: "导师今天催进度吗",                           time: "14:00", self: false },
    { id: 13, sender: "宿舍老三",    content: "又催了，说再不交初稿就要找我谈话",           time: "14:02", self: false },
    { id: 14, sender: "你",          content: "我导师比较佛系，但五月底要交，我有点慌",     time: "14:04", self: true },
    { id: 15, sender: "宿舍老四",    content: "五月底！你还有时间哈",                       time: "14:05", self: false },
    { id: 16, sender: "宿舍老二",    content: "今天又没去图书馆",                           time: "15:20", self: false, date: "昨天" },
    { id: 17, sender: "宿舍老三",    content: "我也是，论文一个字没写",                     time: "15:22", self: false },
    { id: 18, sender: "你",          content: "看了一天b站😇",                              time: "15:30", self: true },
    { id: 19, sender: "宿舍老四",    content: "我起码出门买了杯奶茶，算是有点收获",         time: "15:32", self: false },
    { id: 20, sender: "宿舍老二",    content: "哈哈哈哈哈哈这是什么收获",                   time: "15:33", self: false },
    { id: 21, sender: "你",          content: "奶茶喝的什么，我也想去买",                   time: "15:34", self: true },
    { id: 22, sender: "宿舍老四",    content: "喜茶那边，生打椰椰拿铁，强烈推荐",           time: "15:35", self: false },
  ],

  // 17. 志愿者群
  17: [
    { id: 1,  sender: "活动部小张",  content: "大家好，5月志愿活动安排出来了，一共有3次",   time: "10:00", self: false, date: "4月20日 周日" },
    { id: 2,  sender: "活动部小张",  content: "📅 5月志愿排期：\n• 5/12 图书馆整理 8:00-12:00\n• 5/19 校园清洁 14:00-17:00\n• 5/26 毕业典礼引导 8:00-18:00", time: "10:02", self: false },
    { id: 3,  sender: "志愿者小李",  content: "5/26毕业典礼我可以参加！",                   time: "10:10", self: false },
    { id: 4,  sender: "你",          content: "我报名5/12图书馆整理",                       time: "10:12", self: true },
    { id: 5,  sender: "志愿者小王",  content: "我三个都报！",                               time: "10:13", self: false },
    { id: 6,  sender: "活动部小张",  content: "太好了！每次活动都有志愿时长证明",           time: "10:15", self: false },
    { id: 7,  sender: "志愿者小赵",  content: "志愿时长多少小时每次",                       time: "10:17", self: false },
    { id: 8,  sender: "活动部小张",  content: "图书馆4小时，清洁3小时，毕业典礼8小时",      time: "10:18", self: false },
    { id: 9,  sender: "你",          content: "服装要求有吗",                               time: "10:20", self: true },
    { id: 10, sender: "活动部小张",  content: "@你 穿校服或白色T恤+深色裤子就好",           time: "10:21", self: false },
    { id: 11, sender: "志愿者小李",  content: "毕业典礼那次需要提前培训吗",                 time: "10:25", self: false },
    { id: 12, sender: "活动部小张",  content: "会的，5/24会有一次简短的培训，半小时左右",   time: "10:26", self: false },
    { id: 13, sender: "志愿者小王",  content: "我5/12有课，可以换到下午吗",                 time: "10:30", self: false },
    { id: 14, sender: "活动部小张",  content: "可以，联系我私聊调换",                       time: "10:31", self: false },
    { id: 15, sender: "活动部小张",  content: "5/12志愿排班已出，请大家在群文件查看",       time: "14:00", self: false, date: "周日" },
    { id: 16, sender: "你",          content: "收到",                                       time: "14:30", self: true },
    { id: 17, sender: "志愿者小赵",  content: "我在第二组对吗",                             time: "14:35", self: false },
    { id: 18, sender: "活动部小张",  content: "对，二组8:30在图书馆门口集合",               time: "14:37", self: false },
    { id: 19, sender: "你",          content: "我在第几组",                                 time: "14:40", self: true },
    { id: 20, sender: "活动部小张",  content: "@你 你在第一组，8:00集合",                   time: "14:42", self: false },
    { id: 21, sender: "你",          content: "ok！收到",                                   time: "14:43", self: true },
    { id: 22, sender: "志愿者小李",  content: "期待！一起加油💪",                           time: "14:44", self: false },
  ],
};

// ────────────────────────────────────────────────────────────
//  课表（今天 2026-04-29，只展示今天）
// ────────────────────────────────────────────────────────────
const TODAY = "2026-04-29";

const INITIAL_SCHEDULE: ScheduleEvent[] = [
  { id: 7,  date: TODAY, startTime: "10:10", endTime: "11:00", title: "国家安全学",     location: "逸C-114",  type: "class", color: "#E3F2FD" },
  { id: 8,  date: TODAY, startTime: "18:30", endTime: "20:20", title: "中国近现代史纲要",location: "逸B-302", type: "class", color: "#E1F5FE" },
  // 胶囊确认后写入
];

// ────────────────────────────────────────────────────────────
//  时间胶囊
// ────────────────────────────────────────────────────────────
const CAPSULE_STYLES: Record<string, { bg: string; border: string; badge: string; label: string; dot: string }> = {
  pending:   { bg: "#FFFBE6", border: "#FFD666", badge: "#FA8C16", label: "待确认", dot: "#FA8C16" },
  confirmed: { bg: "#F6FFED", border: "#95DE64", badge: "#52C41A", label: "已确认", dot: "#52C41A" },
  conflict:  { bg: "#FFF1F0", border: "#FFA39E", badge: "#FF4D4F", label: "时间冲突", dot: "#FF4D4F" },
  plan:      { bg: "#EFF6FF", border: "#93C5FD", badge: "#3B82F6", label: "方案胶囊", dot: "#3B82F6" },
  sensitive: { bg: "#F5F5F5", border: "#D9D9D9", badge: "#8C8C8C", label: "敏感信息", dot: "#8C8C8C" },
};

const INITIAL_CAPSULES: Capsule[] = [
  {
    id: 101, type: "pending", group: "计算机网络 · 课程群", title: "📎 第三章作业 DDL",
    content: "5月9日 23:59 前提交\nWord格式，不少于3000字\n邮箱+学习通双平台",
    time: "14:20", from: "张老师", new: true,
    scheduleData: { date: "2026-05-09", startTime: "23:00", endTime: "23:59", title: "📎 计网作业截止", type: "task", color: "#FFE7BA" }
  },
  {
    id: 102, type: "pending", group: "计网课程群", title: "📍 周四下午课地点变更",
    content: "4月30日 14:00 → 教三-204",
    time: "14:00", from: "张老师", new: true,
    scheduleData: { date: TODAY, startTime: "14:00", endTime: "16:00", title: "🔄 计网课（教三-204）", type: "class", color: "#E6F7FF" }
  },
  {
    id: 103, type: "conflict", group: "光影摄影社 × 王老师课题组", title: "⚠️ 周日下午时间冲突",
    content: "周日14:30 摄影外拍（情人谷集合）\n周日15:00 课题组小会议\n两者不可兼得",
    time: "16:32", from: "AI 检测", new: true
  },
  {
    id: 104, type: "plan", group: "小美 💕", title: "🗺️ 周末出游已确定",
    content: "✅ 周六 14:00 中山陵地铁站集合\n👥 小美、小红、你",
    time: "11:38", from: "AI 总结", new: false,
    scheduleData: { date: "2026-05-02", startTime: "14:00", endTime: "18:00", title: "🌸 中山陵出游", type: "event", color: "#FCE4EC" }
  },
  {
    id: 105, type: "pending", group: "Team Phoenix · 创新创业大赛", title: "🔥 初赛截止 5/6",
    content: "PPT + Demo视频 + 申报书\n建议5/5前定稿留出buffer",
    time: "13:01", from: "队友 周", new: true,
    scheduleData: { date: "2026-05-06", startTime: "23:00", endTime: "23:59", title: "🔥 创新赛初赛截止", type: "task", color: "#FFF1F0" }
  },
  {
    id: 106, type: "pending", group: "王老师课题组", title: "🔬 今日组会 16:30",
    content: "4月29日 16:30-19:30\n腾讯会议线上",
    time: "16:32", from: "翁一士", new: true,
    scheduleData: { date: TODAY, startTime: "16:30", endTime: "19:30", title: "🔬 课题组组会(线上)", type: "event", color: "#F9F0FF" }
  },
];

// ────────────────────────────────────────────────────────────
//  AI 回复生成（本地模拟，无需 API Key）
// ────────────────────────────────────────────────────────────
const AI_SUMMARIES: Record<number, string> = {
  1: "📋 **对话总结**\n\n这是2026年PCG校园AI产品创意大赛的官方沟通群。主要内容包括：\n• 大赛要求：PPT（≤20页）+ Demo视频（≤5分钟），打包提交\n• API使用：可用第三方API，但使用腾讯混元有加分\n• 截止时间：5月10日报名，5月20日初赛提交\n\n📌 **待办建议**\n1. 确认是否使用混元API（有加分）\n2. 准备Demo视频，控制在5分钟内\n3. 5月10日前完成报名\n\n💡 还有什么想了解的？",
  2: "📋 **对话总结**\n\n王老师课题组（光学组）的工作动态：\n• 样品处理：师妹们周六除膜后寄到江西\n• 实验进展：横向周期偏差约10nm，载具旋转可能改善\n• 今日事项：16:30线上组会（429组会），翁老师已发腾讯会议链接\n\n📌 **待办建议**\n1. ⚡ 今天16:30参加腾讯会议组会\n2. 整理彩色样品进展，准备汇报\n3. 跟进载具旋转调整方案\n\n💡 还有什么想了解的？",
  3: "📋 **对话总结**\n\n与张师兄的对话要点：\n• 实验问题：横向周期偏差较大（约10nm），可能是曝光量/载具角度问题\n• 建议：曝光量可以试试提到180mJ/cm²\n• 待收图纸：师兄今天下午发\n• 组会准备：建议展示中间过程数据\n\n📌 **行动建议**\n1. 等师兄图纸，按新参数重新曝光\n2. 整理中间过程数据，准备组会\n3. 提前准备彩色片子实验方案\n\n💡 还有什么想了解的？",
  4: "📋 **对话总结**\n\n计网课程群近期重要信息：\n• ⚡ 第三章作业DDL：5月9日23:59，Word格式，不少于3000字，学习通+邮箱双提交\n• 地点变更：本周四（4月30日）课改到教三-204，时间不变14:00\n• 编程题：实现TCP三次握手，Python/C均可，附截图\n\n📌 **紧急待办**\n1. ⚡ 计网作业：还有10天，Word+代码，3000字\n2. 注意周四换教室：教三-204\n3. 提前问清楚学习通的提交格式\n\n💡 还有什么想了解的？",
  9: "📋 **对话总结**\n\nTeam Phoenix创新创业大赛组内进展：\n• 分工：你负责产品设计+PPT，王负责商业模式，刘负责用户调研，周负责技术方案\n• 当前状态：v3版本已发，有待改进点（商业模式单薄、用户画像不具体）\n• ⚡ 截止时间：5月6日23:59，还剩5天，需要今晚出v4\n\n📌 **紧急待办**\n1. 今晚出PPT v4：补充商业模式+用户画像\n2. 等王同学和刘同学的素材（周五截止）\n3. 留出1天时间整合和最终检查\n\n💡 还有什么想了解的？",
  13: "📋 **对话总结**\n\n与小美的周末出游计划：\n• ✅ 已确定：周六（5月2日）下午出游中山陵\n• ✅ 已确定：14:00 中山陵地铁站集合（2号线）\n• ✅ 参与人：你、小美、小红，三人均已确认\n• 预计回程时间未明确，建议提前沟通\n\n📌 **行动建议**\n1. 提前查好地铁路线（2号线中山陵站）\n2. 建议下载中山陵园区地图\n3. 考虑是否需要提前购票（节假日客流量大）\n\n💡 想了解中山陵游玩推荐？直接问我！",
  10: "📋 **对话总结**\n\n与队友刘正昂的近期沟通：\n• 工作进度：PPT商业模式部分正在完善，用户调研数据有新补充\n• 当前待确认：刘发了图片版调研数据（昨晚1:48），你还没看\n• 节奏：刘昨晚熬到2点多，注意提醒他注意身体\n\n📌 **行动建议**\n1. 看一下刘发来的调研图片数据\n2. 确认v4的整合时间\n3. 提醒队友合理休息，别影响后续冲刺\n\n💡 还有什么想了解的？",
};

function getAIFollowup(question: string, chatId: number): string {
  const q = question.toLowerCase();
  // 中山陵相关
  if (q.includes("中山陵") || q.includes("游玩") || q.includes("景点") || q.includes("推荐") || q.includes("攻略")) {
    return `🗺️ **中山陵游玩攻略**（根据你们周六的计划整理）\n\n**主要景点（建议顺序）：**\n1. 🏛️ **博爱坊** → 陵门 → 碑亭（20min）\n2. 🪜 **石阶长廊** — 台阶392步，代表国父年龄，记得数一数！（20min）\n3. ⛩️ **祭堂** — 核心建筑，中山先生坐像，庄严肃穆（20min）\n4. 🌸 **梅花山** — 园内赏花，5月还有些绿意（30min）\n5. ☕ 景区内小食区休息（30min）\n\n**实用提示：**\n• 门票：免费，但需在官微预约\n• 建议2点前到，避开下午最热时段\n• 穿平底鞋！石阶很多\n• 带上充电宝，上山没什么信号\n• 周末人较多，祭堂旁最佳拍照时间在下午4点后\n\n**预计游玩时长：2-3小时**，你们4点多可以出来觅食 🍜`;
  }
  if (q.includes("吃") || q.includes("美食") || q.includes("餐厅") || q.includes("饭")) {
    return `🍜 **中山陵周边美食推荐**\n\n**周边步行可达：**\n1. 🥩 **沪苏浙菜系**——中山路上多家淮扬菜，人均50-80\n2. 🦆 **南京烤鸭**——回程途中路过夫子庙可以顺路尝\n3. 🍵 **鸭血粉丝汤**——南京特色，出景区就有小店，人均15左右\n\n**推荐路线：**\n游完中山陵（约17:00）→ 坐地铁到夫子庙（30min）→ 吃晚饭→ 逛夫子庙夜市 → 打卡秦淮河夜景 🏮\n\n**叫外卖备选：**如果不想走太多路，景区西门附近有便利店和快餐，也可以叫美团外卖到景区门口取🥡`;
  }
  if (q.includes("票") || q.includes("预约") || q.includes("门票") || q.includes("收费")) {
    return `🎫 **中山陵购票/预约说明**\n\n• 中山陵景区 **免费开放**\n• 但需要提前在"钟山风景名胜区"官方微信公众号**实名预约**\n• 每日限流，周末节假日建议提前1-2天预约\n• 景区内的**音乐台、明孝陵**等部分景点需单独买票（20-50元/人）\n\n📱 **预约步骤：**\n微信搜索"钟山风景名胜区" → 点击预约入口 → 选择日期 → 实名填写 → 保存二维码备用\n\n你们3人都需要各自预约，提醒小美和小红提前预约！`;
  }
  if (q.includes("ddl") || q.includes("截止") || q.includes("作业") || q.includes("任务")) {
    return `⏰ **近期DDL汇总（AI帮你整理）**\n\n🔴 **紧急（5天内）：**\n• 创新创业大赛初赛 → 5月6日 23:59\n  （PPT v4 + Demo视频 + 申报书）\n\n🟡 **重要（10天内）：**\n• 计网第三章作业 → 5月9日 23:59\n  （Word 3000字 + 代码，学习通+邮箱双提交）\n\n🟢 **待关注：**\n• 数据结构实验 → 5月15日 24:00\n• 操作系统实验3答辩 → 5月7日 14:00-17:00\n\n📌 **建议今晚先搞定PPT v4，作业可以五一假期冲刺！**`;
  }
  if (q.includes("组会") || q.includes("汇报") || q.includes("准备") || q.includes("ppt")) {
    return `📊 **组会汇报建议**\n\n根据课题组消息，今天16:30有线上组会。建议汇报结构：\n\n**5分钟汇报框架：**\n1. **实验进展**（2min）：本周做了什么，样品数量和状态\n2. **数据结果**（2min）：关键数据图表，横向周期偏差分析\n3. **遇到的问题**（0.5min）：偏差原因分析，载具旋转方案\n4. **下周计划**（0.5min）：曝光量调整实验，彩色片子计划\n\n**翁老师风格：** 喜欢看过程，不只看结果。可以展示中间步骤的数据，哪怕不完美。\n\n💡 提前把数据图整理好，腾讯会议截图方便展示！`;
  }
  // 通用回复
  return `我理解你问的是"${question}"。\n\n基于当前对话内容，我能帮你：\n• 总结聊天中的重要信息和待办\n• 提取时间节点和DDL\n• 提供行动建议\n• 回答与对话相关的具体问题\n\n你可以试试问我：\n💬 "最近有哪些DDL"\n💬 "中山陵游玩推荐"\n💬 "组会要准备什么"\n💬 "出游需要提前预约吗"`;
}

// ────────────────────────────────────────────────────────────
//  提醒文案（基于日程事件动态生成）
// ────────────────────────────────────────────────────────────
function getReminderStyles(event: ScheduleEvent) {
  const title = event.title;
  const deadline = `${event.date.slice(5).replace("-", "/")} ${event.startTime}`;
  return [
    { label: "温柔学姐风", icon: "🌸", text: `亲爱的，「${title}」${event.type === "task" ? "的截止时间快到了" : "快到啦"}哦～（${deadline}），记得提前准备，不要给自己添麻烦～ 加油你可以的！🌸` },
    { label: "毒舌室友风", icon: "😤", text: `喂！「${title}」，${deadline}，你确定你准备好了？！别到时候哭哭啼啼说来不及了，现在不动手等什么！！😤` },
    { label: "佛系朋友风", icon: "🧘", text: `嗯……「${title}」好像快了……（${deadline}）……去不去，做不做……随缘吧……但……还是……做一下？可能……会好一点？🧘` },
    { label: "正经班委风", icon: "📋", text: `[提醒] 「${title}」时间节点为 ${deadline}，请相关同学按时完成，如有特殊情况请提前沟通，不接受事后补交。` },
  ];
}

// ────────────────────────────────────────────────────────────
//  主组件
// ────────────────────────────────────────────────────────────
export default function QCapsuleDemo() {
  const [activeChat, setActiveChat] = useState<number>(2);
  const [messages, setMessages] = useState<Record<number, Message[]>>(INITIAL_MESSAGES);
  const [capsules, setCapsules] = useState<Capsule[]>(INITIAL_CAPSULES);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>(INITIAL_SCHEDULE);
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>(() =>
    Object.fromEntries(CHATS.map(c => [c.id, c.unread]))
  );
  const [newCapsuleIds, setNewCapsuleIds] = useState<number[]>([101, 102, 103, 105, 106]);
  const [flyingCapsule, setFlyingCapsule] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [rightTab, setRightTab] = useState<"schedule" | "capsule">("schedule");
  const [dailyReport, setDailyReport] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);

  // 提醒文案（基于选中的日程事件）
  const [reminderEvent, setReminderEvent] = useState<ScheduleEvent | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [sentReminder, setSentReminder] = useState(false);

  // AI 总结面板
  const [aiPanelVisible, setAiPanelVisible] = useState(false);
  const [aiChatId, setAiChatId] = useState<number | null>(null);
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [searchKw, setSearchKw] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChat]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiLoading]);

  const showToast = (msg: string, color = "#52C41A") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2800);
  };

  // 切换聊天 → 清除未读
  const handleSelectChat = (id: number) => {
    setActiveChat(id);
    setUnreadMap(prev => ({ ...prev, [id]: 0 }));
    // 关闭AI面板如果切换了chat
    if (aiChatId !== id) {
      setAiPanelVisible(false);
    }
  };

  // 打开 AI 总结
  const openAiPanel = (chatId: number) => {
    setAiChatId(chatId);
    setAiPanelVisible(true);
    setAiInput("");
    if (aiChatId !== chatId) {
      // 新会话，自动生成总结
      setAiMessages([]);
      setAiLoading(true);
      setTimeout(() => {
        const summary = AI_SUMMARIES[chatId] ||
          `📋 **对话总结**\n\n基于「${CHATS.find(c=>c.id===chatId)?.name}」的 ${(INITIAL_MESSAGES[chatId]||[]).length} 条消息分析：\n• 这是一段关于 ${CHATS.find(c=>c.id===chatId)?.category} 的对话\n• 暂未检测到紧急待办\n• 最近活跃度较高\n\n💡 你可以问我具体问题，如"有哪些待办"或"最近在讨论什么"`;
        setAiMessages([{ role: "ai", content: summary }]);
        setAiLoading(false);
      }, 1200);
    }
  };

  const sendAiMessage = (text?: string) => {
    const q = text || aiInput.trim();
    if (!q) return;
    setAiMessages(prev => [...prev, { role: "user", content: q }]);
    setAiInput("");
    setAiLoading(true);
    setTimeout(() => {
      const reply = getAIFollowup(q, aiChatId || activeChat);
      setAiMessages(prev => [...prev, { role: "ai", content: reply }]);
      setAiLoading(false);
    }, 900);
  };

  // ── 点击日程事件 → 打开提醒文案 ──
  const handleScheduleClick = (event: ScheduleEvent) => {
    setReminderEvent(event);
    setSelectedStyle(0);
    setSentReminder(false);
  };

  // ── 模拟：DDL 抓取 ──
  const simulateDDL = () => {
    setActiveChat(4);
    setUnreadMap(prev => ({ ...prev, 4: 0 }));
    setTimeout(() => {
      const newMsg: Message = {
        id: Date.now(), sender: "张老师",
        content: "再次补充：作业请同步上传到学习通平台，截止时间5月9日23:59，不接受补交！",
        time: "22:05", self: false,
      };
      setMessages(prev => ({ ...prev, 4: [...(prev[4] || []), newMsg] }));
    }, 400);
    setTimeout(() => {
      const cap: Capsule = {
        id: Date.now(), type: "pending", group: "计算机网络 · 课程群",
        title: "📎 作业补充要求",
        content: "学习通也要交！5/9 23:59 截止，不接受补交",
        time: "22:05", from: "张老师", new: true,
        scheduleData: { date: "2026-05-09", startTime: "23:00", endTime: "23:59", title: "📎 计网作业截止（双平台）", type: "task", color: "#FFE7BA" }
      };
      setCapsules(prev => [cap, ...prev]);
      setNewCapsuleIds(prev => [cap.id, ...prev]);
      setFlyingCapsule(cap.id);
      setRightTab("capsule");
      setTimeout(() => setFlyingCapsule(null), 800);
      showToast("🟡 新胶囊已捕获，飞入右栏");
    }, 1100);
  };

  // ── 模拟：冲突检测 ──
  const simulateConflict = () => {
    setActiveChat(7);
    setUnreadMap(prev => ({ ...prev, 7: 0 }));
    setTimeout(() => {
      const newMsg: Message = {
        id: Date.now(), sender: "班长 李同学",
        content: "再次确认：5月18日 紫金山团建，全天活动，要去的报名",
        time: "20:20", self: false,
      };
      setMessages(prev => ({ ...prev, 7: [...(prev[7] || []), newMsg] }));
    }, 400);
    setTimeout(() => {
      const cap: Capsule = {
        id: Date.now(), type: "conflict", group: "班级群 × 创新创业大赛",
        title: "🚨 5/18 时间冲突",
        content: "5/18 紫金山团建（全天）\n5/18 创新创业讲座（10:00-12:00）\n两者重叠，需取舍",
        time: "20:20", from: "AI 冲突检测", new: true,
      };
      setCapsules(prev => [cap, ...prev]);
      setNewCapsuleIds(prev => [cap.id, ...prev]);
      setFlyingCapsule(cap.id);
      setRightTab("capsule");
      setTimeout(() => setFlyingCapsule(null), 800);
      showToast("🔴 冲突检测！已生成红色胶囊", "#FF4D4F");
    }, 1100);
  };

  // ── 模拟：群体排期 ──
  const simulateSchedule = () => {
    setActiveChat(13);
    setUnreadMap(prev => ({ ...prev, 13: 0 }));
    setTimeout(() => {
      const newMsg: Message = {
        id: Date.now(), sender: "你",
        content: "@Q仔 帮我们找下周末共同空闲时间",
        time: "12:00", self: true,
      };
      setMessages(prev => ({ ...prev, 13: [...(prev[13] || []), newMsg] }));
      setTimeout(() => {
        const qMsg: Message = {
          id: Date.now() + 1, sender: "Q仔", isAI: true,
          content: "好的！基于三人日程（仅显示共同空闲，不展示个人详情），找到 3 个共同时段：\n\n① 本周六 14:00–16:00 ✅\n② 本周日 10:00–12:00\n③ 下周六 15:00–17:00\n\n任一人点确认即可写入所有人日程 👇",
          time: "12:00", self: false,
        };
        setMessages(prev => ({ ...prev, 13: [...(prev[13] || []), qMsg] }));
        setScheduleModal(true);
      }, 700);
    }, 400);
  };

  // ── 确认胶囊 ──
  const confirmCapsule = (id: number) => {
    const cap = capsules.find(c => c.id === id);
    setCapsules(prev => prev.map(c => c.id === id ? { ...c, type: "confirmed", new: false } : c));
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
        fromCapsule: true,
        groupName: cap.group,
      };
      // 只有今天的事件才加进日程表显示
      setSchedule(prev => [...prev, ev]);
      showToast("✅ 胶囊已确认，日程表已更新", "#52C41A");
      if (ev.date === TODAY) setRightTab("schedule");
    } else {
      showToast("✅ 胶囊已确认", "#52C41A");
    }
  };

  const dismissCapsule = (id: number) => {
    setCapsules(prev => prev.filter(c => c.id !== id));
    setNewCapsuleIds(prev => prev.filter(i => i !== id));
    showToast("已忽略该胶囊", "#8C8C8C");
  };

  // ── 辅助 ──
  const currentChat = CHATS.find(c => c.id === activeChat);
  const filteredChats = CHATS.filter(c => !searchKw || c.name.toLowerCase().includes(searchKw.toLowerCase()));
  const pendingCount = capsules.filter(c => c.type === "pending" || c.type === "conflict").length;
  const totalUnread = Object.values(unreadMap).reduce((s, v) => s + v, 0);
  const todayEvents = schedule.filter(e => e.date === TODAY).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const reminderStyles = reminderEvent ? getReminderStyles(reminderEvent) : [];

  // ── 渲染 ──
  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#F0F2F5", fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif", overflow: "hidden", position: "relative", color: "#333" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "#fff", padding: "10px 22px", borderRadius: 24, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
          {toast.msg}
        </div>
      )}

      {/* ══ 左侧 QQ 导航条 ══ */}
      <div style={{ width: 56, background: "linear-gradient(180deg,#2D3138 0%,#1F2329 100%)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 4 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#4A90D9,#7B68EE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12, border: "2px solid #fff" }}>小A</div>
        {[
          { icon: "💬", badge: totalUnread, active: true },
          { icon: "👥" }, { icon: "📁" }, { icon: "🎮" }, { icon: "📅" },
        ].map((item, i) => (
          <div key={i} style={{ position: "relative", width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", background: item.active ? "rgba(74,144,217,0.2)" : "transparent", color: item.active ? "#4A90D9" : "#9DA1A6" }}>
            {item.icon}
            {item.badge && item.badge > 0 ? <div style={{ position: "absolute", top: -2, right: -2, background: "#FF4D4F", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 8, minWidth: 16, textAlign: "center" }}>{item.badge}</div> : null}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#4A90D9,#9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Q</div>
      </div>

      {/* ══ 聊天列表 ══ */}
      <div style={{ width: 280, background: "#fff", borderRight: "1px solid #E5E5E5", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 30, background: "#F5F5F5", borderRadius: 6, padding: "0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#999" }}>🔍</span>
            <input value={searchKw} onChange={e => setSearchKw(e.target.value)} placeholder="搜索" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12.5, color: "#333" }} />
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#666", cursor: "pointer" }}>+</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredChats.map(chat => {
            const lastMsgs = messages[chat.id] || [];
            const previewMsg = lastMsgs[lastMsgs.length - 1];
            const previewText = previewMsg
              ? previewMsg.isSystem ? previewMsg.content
              : `${previewMsg.self ? "" : previewMsg.sender + ": "}${previewMsg.content.replace(/\n/g, " ").slice(0, 20)}`
              : chat.lastMsg;
            const unread = unreadMap[chat.id] || 0;
            return (
              <div key={chat.id} onClick={() => handleSelectChat(chat.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: activeChat === chat.id ? "#E8F0FE" : chat.pinned ? "#FAFBFD" : "transparent", borderBottom: "1px solid #F5F5F5", transition: "background 0.12s" }}
                onMouseEnter={e => { if (activeChat !== chat.id) (e.currentTarget as HTMLElement).style.background = "#F5F7FA"; }}
                onMouseLeave={e => { if (activeChat !== chat.id) (e.currentTarget as HTMLElement).style.background = chat.pinned ? "#FAFBFD" : "transparent"; }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: chat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: chat.avatar.length > 1 ? 18 : 16, fontWeight: 700, color: "#fff" }}>{chat.avatar}</div>
                  {chat.online && <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "#52C41A", border: "2px solid #fff" }} />}
                </div>
                <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                      {chat.pinned && <span style={{ color: "#FA8C16", marginRight: 3, fontSize: 10 }}>📌</span>}
                      {chat.name}
                    </span>
                    <span style={{ fontSize: 10.5, color: "#999", marginLeft: 6, flexShrink: 0 }}>{chat.lastTime}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11.5, color: "#999", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{previewText}</span>
                    {unread > 0 && <div style={{ background: "#FF4D4F", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center", marginLeft: 4 }}>{unread > 99 ? "99+" : unread}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 8, background: "#FAFBFD" }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg,#4A90D9,#9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>Q</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#4A90D9" }}>Q 仔时间胶囊</div>
            <div style={{ fontSize: 10, color: "#999" }}>静默监听中 · 已抓 {capsules.length} 个胶囊</div>
          </div>
          {pendingCount > 0 && <div style={{ background: "#FA8C16", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8 }}>{pendingCount}</div>}
        </div>
      </div>

      {/* ══ 中间聊天区 ══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F0F2F5", minWidth: 0 }}>
        {/* 顶栏 */}
        <div style={{ padding: "12px 20px", background: "#fff", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: currentChat?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff" }}>{currentChat?.avatar}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>
                {currentChat?.name}
                {currentChat?.count && <span style={{ fontSize: 12, color: "#999", marginLeft: 6, fontWeight: 400 }}>({currentChat.count})</span>}
              </div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{currentChat?.type === "private" ? (currentChat.online ? "● 在线" : "离线") : `${currentChat?.category}群`}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => openAiPanel(activeChat)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", background: aiPanelVisible && aiChatId === activeChat ? "linear-gradient(135deg,#4A90D9,#7B68EE)" : "#F0F7FF", color: aiPanelVisible && aiChatId === activeChat ? "#fff" : "#4A90D9", border: "1.5px solid #BAE0FF", borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ✨ AI总结
            </button>
            <div style={{ fontSize: 11, color: "#4A90D9", background: "#E8F0FE", padding: "4px 10px", borderRadius: 12, border: "1px solid #BAE0FF", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#52C41A", display: "inline-block" }} />
              Q仔监听中
            </div>
          </div>
        </div>

        {/* 消息区 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          {(messages[activeChat] || []).map((msg, idx) => {
            const prevMsg = (messages[activeChat] || [])[idx - 1];
            const showDate = msg.date && (!prevMsg || prevMsg.date !== msg.date);
            if (msg.isSystem) return (
              <div key={msg.id}>
                {showDate && <div style={{ textAlign: "center", margin: "16px 0 12px", fontSize: 11, color: "#999" }}><span style={{ background: "#E5E8EE", padding: "3px 12px", borderRadius: 10 }}>{msg.date}</span></div>}
                <div style={{ textAlign: "center", margin: "6px 0", fontSize: 11, color: "#999" }}>{msg.content}</div>
              </div>
            );
            return (
              <div key={msg.id}>
                {showDate && <div style={{ textAlign: "center", margin: "16px 0 12px", fontSize: 11, color: "#999" }}><span style={{ background: "#E5E8EE", padding: "3px 12px", borderRadius: 10 }}>{msg.date}</span></div>}
                <div style={{ display: "flex", flexDirection: msg.self ? "row-reverse" : "row", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: msg.isAI ? "linear-gradient(135deg,#4A90D9,#9B59B6)" : msg.self ? "linear-gradient(135deg,#4A90D9,#7B68EE)" : `hsl(${(msg.sender.charCodeAt(0)*17)%360},60%,60%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                    {msg.isAI ? "Q" : msg.self ? "我" : msg.sender.slice(0, 1)}
                  </div>
                  <div style={{ maxWidth: "62%", display: "flex", flexDirection: "column", alignItems: msg.self ? "flex-end" : "flex-start" }}>
                    {!msg.self && <div style={{ fontSize: 11, color: msg.isAI ? "#4A90D9" : "#666", marginBottom: 3, fontWeight: msg.isAI ? 600 : 400 }}>{msg.isAI ? "Q 仔 · AI助手" : msg.sender}<span style={{ color: "#bbb", marginLeft: 6, fontSize: 10 }}>{msg.time}</span></div>}
                    <div style={{ padding: "8px 12px", borderRadius: msg.self ? "10px 4px 10px 10px" : "4px 10px 10px 10px", background: msg.self ? "#A6D8FF" : msg.isAI ? "linear-gradient(135deg,#F0F7FF,#F5F0FF)" : "#fff", color: "#333", fontSize: 13.5, lineHeight: 1.55, border: msg.atMe ? "1.5px solid #FA8C16" : msg.isAI ? "1px solid #BAE0FF" : "1px solid #EAEAEA", whiteSpace: "pre-line", wordBreak: "break-word", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                      {msg.content}
                    </div>
                    {msg.self && <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>{msg.time}</div>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* 输入框 */}
        <div style={{ background: "#fff", borderTop: "1px solid #E5E5E5" }}>
          <div style={{ padding: "8px 16px 4px", display: "flex", alignItems: "center", gap: 14, fontSize: 16 }}>
            {["😀", "✂️", "📁", "🖼️", "📨", "🎤"].map((i, k) => <span key={k} style={{ cursor: "pointer", color: "#666" }}>{i}</span>)}
            <div style={{ flex: 1 }} />
            <span style={{ cursor: "pointer", color: "#666", fontSize: 14 }}>⏰</span>
          </div>
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ minHeight: 56, padding: "8px 12px", background: "#F8F9FB", borderRadius: 6, border: "1px solid #EAEAEA", fontSize: 12.5, color: "#bbb" }}>输入消息…</div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <button style={{ padding: "5px 18px", borderRadius: 4, border: "1px solid #4A90D9", background: "#fff", color: "#4A90D9", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 8 }}>Ctrl+Enter</button>
              <button style={{ padding: "5px 18px", borderRadius: 4, border: "none", background: "linear-gradient(135deg,#4A90D9,#2563EB)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>发送 ▾</button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ 右侧面板：日程表 / 胶囊 / AI总结 ══ */}
      <div style={{ width: 360, background: "#fff", borderLeft: "1px solid #E5E5E5", display: "flex", flexDirection: "column" }}>
        {/* Tab */}
        {!aiPanelVisible && (
          <div style={{ display: "flex", borderBottom: "1px solid #E5E5E5", background: "#FAFBFD" }}>
            {[
              { key: "schedule", label: "📅 今日日程", count: todayEvents.length },
              { key: "capsule",  label: "🟡 时间胶囊",  count: pendingCount },
            ].map(tab => (
              <button key={tab.key} onClick={() => setRightTab(tab.key as any)}
                style={{ flex: 1, padding: "12px", border: "none", background: rightTab === tab.key ? "#fff" : "transparent", color: rightTab === tab.key ? "#4A90D9" : "#666", fontSize: 12.5, fontWeight: rightTab === tab.key ? 700 : 500, cursor: "pointer", borderBottom: rightTab === tab.key ? "2px solid #4A90D9" : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {tab.label}
                {tab.count > 0 && <span style={{ background: rightTab === tab.key ? "#4A90D9" : "#FA8C16", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8 }}>{tab.count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* ─ AI 总结面板 ─ */}
        {aiPanelVisible && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* AI 面板头部 */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,#F0F7FF 0%,#F5F0FF 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#4A90D9,#9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>Q</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>Q仔 · AI 对话总结</div>
                  <div style={{ fontSize: 10, color: "#999" }}>基于「{CHATS.find(c=>c.id===aiChatId)?.name}」</div>
                </div>
              </div>
              <button onClick={() => setAiPanelVisible(false)} style={{ fontSize: 18, color: "#999", cursor: "pointer", background: "none", border: "none", padding: "0 4px" }}>×</button>
            </div>
            {/* 消息列表 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {aiMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start", gap: 6 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 5, flexShrink: 0, background: msg.role === "user" ? "#4A90D9" : "linear-gradient(135deg,#4A90D9,#9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                    {msg.role === "user" ? "我" : "Q"}
                  </div>
                  <div style={{ maxWidth: "82%", padding: "9px 12px", borderRadius: msg.role === "user" ? "10px 4px 10px 10px" : "4px 10px 10px 10px", background: msg.role === "user" ? "#A6D8FF" : "#F5F7FA", fontSize: 12.5, color: "#333", lineHeight: 1.6, whiteSpace: "pre-line", border: "1px solid " + (msg.role === "user" ? "transparent" : "#E5E8EE") }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 5, background: "linear-gradient(135deg,#4A90D9,#9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>Q</div>
                  <div style={{ padding: "8px 12px", borderRadius: "4px 10px 10px 10px", background: "#F5F7FA", fontSize: 12, color: "#999" }}>Q仔思考中…</div>
                </div>
              )}
              <div ref={aiEndRef} />
            </div>
            {/* 快捷问题 */}
            {aiMessages.length <= 1 && !aiLoading && (
              <div style={{ padding: "8px 14px", borderTop: "1px solid #F0F0F0" }}>
                <div style={{ fontSize: 10.5, color: "#999", marginBottom: 7 }}>快速提问</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(aiChatId === 13
                    ? ["中山陵游玩推荐🗺️", "附近有什么好吃的🍜", "需要提前预约吗🎫", "最近有哪些DDL⏰"]
                    : aiChatId === 9
                    ? ["还有哪些DDL⏰", "PPT改哪里💡", "生成催稿文案📨", "最近有哪些DDL⏰"]
                    : ["最近有哪些DDL⏰", "总结一下待办📝", "今天需要做什么", "组会要准备什么"]
                  ).map((q, i) => (
                    <button key={i} onClick={() => sendAiMessage(q)} style={{ padding: "5px 10px", borderRadius: 12, border: "1px solid #E5E8EE", background: "#FAFBFD", color: "#4A90D9", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* 输入框 */}
            <div style={{ padding: "10px 12px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 6 }}>
              <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && aiInput.trim()) sendAiMessage(); }}
                placeholder="问问Q仔，比如「中山陵游玩推荐」"
                style={{ flex: 1, height: 32, padding: "0 10px", border: "1px solid #E5E8EE", borderRadius: 6, fontSize: 12, outline: "none", color: "#333" }} />
              <button onClick={() => sendAiMessage()} style={{ padding: "0 12px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#4A90D9,#7B68EE)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>发送</button>
            </div>
          </div>
        )}

        {/* ─ 日程表（只显示今天）─ */}
        {!aiPanelVisible && rightTab === "schedule" && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {/* 头部 */}
            <div style={{ padding: "14px 16px 12px", background: "linear-gradient(135deg,#F5F0FF 0%,#FFF0F5 100%)", borderBottom: "1px solid #F0F0F0" }}>
              <div style={{ fontSize: 11, color: "#9B59B6", fontWeight: 600 }}>2024-2025学年 第2学期</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#333", marginTop: 2 }}>
                今天 · 4月29日 周三
                <span style={{ fontSize: 11, color: "#999", fontWeight: 500, marginLeft: 8 }}>第10周</span>
              </div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>点击日程事件可生成提醒文案 ↓</div>
            </div>

            {/* 事件列表（只读，点击生成提醒）*/}
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {todayEvents.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "#bbb", fontSize: 13 }}>今天暂无安排 🐟</div>
              ) : todayEvents.map(ev => {
                const now = "16:30";
                const isPast = ev.endTime < now;
                return (
                  <div key={ev.id} onClick={() => handleScheduleClick(ev)}
                    style={{ display: "flex", gap: 8, padding: "10px 12px", background: ev.color, borderRadius: 10, border: ev.fromCapsule ? "1.5px dashed #4A90D9" : "1px solid rgba(0,0,0,0.06)", opacity: isPast ? 0.55 : 1, cursor: "pointer", transition: "transform 0.1s, box-shadow 0.1s", position: "relative" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
                    <div style={{ width: 4, borderRadius: 2, background: ev.type === "task" ? "#FA8C16" : ev.type === "exam" ? "#FF4D4F" : ev.type === "event" ? "#9B59B6" : "#4A90D9", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{ev.title}</div>
                      <div style={{ fontSize: 10.5, color: "#666", marginTop: 2 }}>
                        🕒 {ev.startTime}–{ev.endTime}
                        {ev.location && <span style={{ marginLeft: 8 }}>📍 {ev.location}</span>}
                      </div>
                      {ev.fromCapsule && <div style={{ fontSize: 10, color: "#4A90D9", marginTop: 2, fontWeight: 600 }}>🟡 来自胶囊 · {ev.groupName}</div>}
                    </div>
                    <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: isPast ? "#999" : "#4A90D9", fontWeight: 600 }}>{isPast ? "已结束" : "点击提醒 →"}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid #F0F0F0", background: "#FAFBFD" }}>
              <div style={{ fontSize: 11, color: "#999", textAlign: "center" }}>点击任意日程可生成 AI 提醒文案</div>
            </div>
          </div>
        )}

        {/* ─ 时间胶囊 ─ */}
        {!aiPanelVisible && rightTab === "capsule" && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#666" }}>共 {capsules.length} 个 · {pendingCount} 待确认</span>
              <span style={{ fontSize: 11, color: "#4A90D9", cursor: "pointer" }}>全部 ▾</span>
            </div>
            <div style={{ flex: 1, padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {capsules.map(cap => {
                const st = CAPSULE_STYLES[cap.type] || CAPSULE_STYLES.pending;
                const isNew = newCapsuleIds.includes(cap.id);
                const isFlying = flyingCapsule === cap.id;
                return (
                  <div key={cap.id} style={{ background: st.bg, border: `1.5px solid ${st.border}`, borderRadius: 12, padding: "10px 12px", transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)", transform: isFlying ? "scale(1.04)" : "scale(1)", boxShadow: isNew ? `0 0 0 2px ${st.border}66, 0 4px 14px ${st.border}44` : "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: st.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a2e", flex: 1 }}>{cap.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: st.badge, background: st.badge + "22", padding: "1px 7px", borderRadius: 8 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#3a3a5c", lineHeight: 1.55, marginBottom: 8, whiteSpace: "pre-line" }}>{cap.type === "sensitive" ? "●●●● ●●●●●●●● ●●" : cap.content}</div>
                    <div style={{ fontSize: 10, color: "#999", marginBottom: cap.type !== "confirmed" ? 8 : 0 }}>📍 {cap.group} · {cap.from} · {cap.time}</div>
                    {cap.type !== "confirmed" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => confirmCapsule(cap.id)} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", background: st.badge, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          ✓ {cap.scheduleData ? "确认入日程" : "确认"}
                        </button>
                        <button onClick={() => dismissCapsule(cap.id)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${st.border}`, background: "transparent", color: "#999", fontSize: 11, cursor: "pointer" }}>✗</button>
                      </div>
                    )}
                    {cap.type === "confirmed" && <div style={{ fontSize: 11, color: "#52C41A", fontWeight: 600 }}>✓ 已加入日程</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ 演示场景按钮 ══ */}
      <div style={{ position: "fixed", bottom: 16, left: 380, background: "rgba(255,255,255,0.97)", border: "1px solid #E5E5E5", borderRadius: 18, padding: "8px 14px", display: "flex", gap: 8, alignItems: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 1000 }}>
        <span style={{ fontSize: 11, color: "#4A90D9", fontWeight: 700, marginRight: 4 }}>🎮 演示</span>
        {[
          { label: "📎 DDL抓取",   action: simulateDDL,      color: "#FA8C16" },
          { label: "🚨 冲突检测",  action: simulateConflict, color: "#FF4D4F" },
          { label: "📅 群体排期",  action: simulateSchedule, color: "#7B68EE" },
          { label: "📋 22:00日报", action: () => setDailyReport(true), color: "#4A90D9" },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} style={{ padding: "5px 11px", borderRadius: 10, border: `1.5px solid ${btn.color}55`, background: btn.color + "15", color: btn.color, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{btn.label}</button>
        ))}
      </div>

      {/* ══ 弹窗：晚间日报 ══ */}
      {dailyReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={() => setDailyReport(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "26px 28px", width: 380, boxShadow: "0 20px 60px rgba(74,144,217,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 13, color: "#4A90D9", fontWeight: 700, marginBottom: 4 }}>🌙 Q 仔 · 晚间日报</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#333", marginBottom: 16 }}>今天有 {pendingCount} 条待确认</div>
            {capsules.filter(c => c.type === "pending" || c.type === "conflict").map(cap => (
              <div key={cap.id} style={{ background: CAPSULE_STYLES[cap.type].bg, border: `1px solid ${CAPSULE_STYLES[cap.type].border}`, borderRadius: 8, padding: "9px 12px", marginBottom: 6 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a2e" }}>{cap.title}</div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>{cap.content.slice(0, 50)}…</div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#999", margin: "12px 0" }}>点击「开始确认」前往胶囊栏处理，预计 30 秒</div>
            <button onClick={() => { setDailyReport(false); setRightTab("capsule"); }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4A90D9,#7B68EE)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>开始确认 →</button>
          </div>
        </div>
      )}

      {/* ══ 弹窗：提醒文案（基于点击的日程）══ */}
      {reminderEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={() => { setReminderEvent(null); setSentReminder(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "26px", width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#333", marginBottom: 4 }}>💬 生成提醒文案</div>
            <div style={{ fontSize: 12, color: "#4A90D9", background: "#EFF6FF", padding: "6px 10px", borderRadius: 8, marginBottom: 14, fontWeight: 500 }}>
              针对：{reminderEvent.title}　{reminderEvent.date.slice(5).replace("-","/")} {reminderEvent.startTime}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {reminderStyles.map((s, i) => (
                <button key={i} onClick={() => setSelectedStyle(i)} style={{ padding: "5px 10px", borderRadius: 10, border: `1.5px solid ${selectedStyle === i ? "#4A90D9" : "#E5E8EE"}`, background: selectedStyle === i ? "#E8F0FE" : "#fff", color: selectedStyle === i ? "#4A90D9" : "#666", fontSize: 11.5, cursor: "pointer", fontWeight: selectedStyle === i ? 700 : 400 }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
            <div style={{ background: "#F8F9FB", border: "1px solid #E5E8EE", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#333", lineHeight: 1.6, marginBottom: 16, minHeight: 64 }}>
              {reminderStyles[selectedStyle]?.text}
            </div>
            {!sentReminder ? (
              <button onClick={() => setSentReminder(true)} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4A90D9,#7B68EE)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                一键发送提醒
              </button>
            ) : (
              <div style={{ textAlign: "center", color: "#52C41A", fontWeight: 700, fontSize: 14, padding: "10px 0" }}>✅ 提醒已发送！</div>
            )}
          </div>
        </div>
      )}

      {/* ══ 弹窗：群体排期 ══ */}
      {scheduleModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={() => setScheduleModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "26px", width: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#333", marginBottom: 4 }}>📅 Q 仔 · 群体排期</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>已计算三人共同空闲（不展示个人详细安排）</div>
            {[
              { time: "本周六 14:00–16:00", hot: true },
              { time: "本周日 10:00–12:00", hot: false },
              { time: "下周六 15:00–17:00", hot: false },
            ].map((slot, i) => (
              <div key={i} style={{ background: slot.hot ? "#F5F0FF" : "#FAFBFD", border: `1.5px solid ${slot.hot ? "#7B68EE" : "#E5E8EE"}`, borderRadius: 10, padding: "11px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: slot.hot ? "#7B68EE" : "#666", fontWeight: slot.hot ? 700 : 400 }}>{slot.hot && "🔥 "}{slot.time}</span>
                <button onClick={() => { setScheduleModal(false); showToast("✅ 已写入所有人日程！", "#7B68EE"); }} style={{ padding: "4px 11px", borderRadius: 6, border: "none", background: slot.hot ? "#7B68EE" : "#BFBFBF", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>就这个</button>
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: "#bbb", marginTop: 6 }}>* 任一人确认后自动写入全部参与者日程</div>
          </div>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D9DCE0; border-radius: 4px; }
        input::placeholder { color: #BFBFBF; }
      `}</style>
    </div>
  );
}
