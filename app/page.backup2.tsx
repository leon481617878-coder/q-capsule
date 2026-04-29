"use client";
import { useState, useEffect, useRef } from "react";

// ────────────────────────────────────────────────────────────
//  类型定义
// ────────────────────────────────────────────────────────────
type ChatType = "group" | "private";
type Chat = {
  id: number;
  type: ChatType;
  name: string;
  category: string;
  avatar: string;
  color: string;
  count?: number;
  lastTime: string;
  lastMsg: string;
  unread: number;
  pinned?: boolean;
  online?: boolean;
};

type Message = {
  id: number;
  sender: string;
  content: string;
  time: string;
  self: boolean;
  isAI?: boolean;
  date?: string; // 日期分割
  isSystem?: boolean; // 系统消息（XX加入了群聊）
  atMe?: boolean;
};

type ScheduleEvent = {
  id: number;
  date: string; // "2026-04-29"
  startTime: string; // "08:00"
  endTime: string; // "08:50"
  title: string;
  location?: string;
  type: "class" | "task" | "event" | "exam";
  color: string;
  fromCapsule?: boolean;
  groupName?: string;
};

type Capsule = {
  id: number;
  type: "pending" | "confirmed" | "conflict" | "plan" | "sensitive";
  group: string;
  title: string;
  content: string;
  time: string;
  from: string;
  new: boolean;
  scheduleData?: Partial<ScheduleEvent>;
};

// ────────────────────────────────────────────────────────────
//  聊天列表 - 17个会话
// ────────────────────────────────────────────────────────────
const CHATS: Chat[] = [
  // 置顶
  { id: 1, type: "group", name: "2026PCG校园AI产品创意大赛官方沟通群", category: "竞赛", avatar: "🏆", color: "#FF6B6B", count: 1010, lastTime: "15:08", lastMsg: "云上枫加入了群聊", unread: 9, pinned: true },
  { id: 2, type: "group", name: "王老师课题组 | 光学组", category: "科研", avatar: "🔬", color: "#7B68EE", count: 18, lastTime: "16:32", lastMsg: "翁一士: 明日组会线上[旺柴][强]", unread: 6, pinned: true },
  { id: 3, type: "private", name: "张师兄", category: "联系人", avatar: "张", color: "#52C41A", lastTime: "15:42", lastMsg: "图纸我下午发你", unread: 1, online: true },
  // 课程通知
  { id: 4, type: "group", name: "计算机网络 · 课程群", category: "课程", avatar: "📡", color: "#4A90D9", count: 247, lastTime: "14:20", lastMsg: "张老师: 周五DDL，提交学习通", unread: 3 },
  { id: 5, type: "group", name: "数据结构与算法-2024秋", category: "课程", avatar: "📚", color: "#1989FA", count: 189, lastTime: "11:08", lastMsg: "[图片]", unread: 0 },
  { id: 6, type: "group", name: "操作系统课程群", category: "课程", avatar: "💻", color: "#13C2C2", count: 156, lastTime: "昨天", lastMsg: "助教: 实验3报告模板已上传", unread: 0 },
  // 班级/学院
  { id: 7, type: "group", name: "计科2101班级群", category: "班级", avatar: "🎓", color: "#52C41A", count: 32, lastTime: "10:45", lastMsg: "班长: 班费收缴通知", unread: 2 },
  { id: 8, type: "group", name: "计算机学院2026届毕业群", category: "学院", avatar: "🏫", color: "#FA8C16", count: 487, lastTime: "昨天", lastMsg: "[公告] 毕业论文盲审说明", unread: 0 },
  // 竞赛/项目
  { id: 9, type: "group", name: "Team Phoenix · 创新创业大赛", category: "竞赛", avatar: "🔥", color: "#FF4D4F", count: 5, lastTime: "13:22", lastMsg: "我把PPT v3发群里了", unread: 4 },
  { id: 10, type: "private", name: "队友 刘正昂", category: "联系人", avatar: "刘", color: "#FF6B6B", lastTime: "01:48", lastMsg: "[图片]", unread: 0 },
  // 社团
  { id: 11, type: "group", name: "光影摄影社·成员群", category: "社团", avatar: "📷", color: "#9B59B6", count: 89, lastTime: "昨天", lastMsg: "周六外拍改情人谷", unread: 0 },
  { id: 12, type: "group", name: "校学生会宣传部", category: "学生组织", avatar: "📢", color: "#FFB347", count: 24, lastTime: "周一", lastMsg: "[文件] 5月活动排期.xlsx", unread: 0 },
  // 私聊
  { id: 13, type: "private", name: "小美 💕", category: "好友", avatar: "美", color: "#FF85A2", lastTime: "11:38", lastMsg: "👍 中山陵下午2点见", unread: 0, online: true },
  { id: 14, type: "private", name: "班长 李同学", category: "联系人", avatar: "李", color: "#52C41A", lastTime: "10:50", lastMsg: "班费的事麻烦下", unread: 1 },
  { id: 15, type: "private", name: "妈妈 ❤️", category: "家人", avatar: "妈", color: "#F5222D", lastTime: "昨天", lastMsg: "记得吃饭啊孩子", unread: 0 },
  // 闲聊
  { id: 16, type: "group", name: "毕业摆烂群😴", category: "闲聊", avatar: "🛋️", color: "#8C8C8C", count: 8, lastTime: "昨天", lastMsg: "今天又没去图书馆", unread: 0 },
  { id: 17, type: "group", name: "校园活动志愿者群", category: "活动", avatar: "🎪", color: "#36CFC9", count: 64, lastTime: "周日", lastMsg: "5/12志愿排班已出", unread: 0 },
];

// ────────────────────────────────────────────────────────────
//  各会话的初始消息（丰富内容）
// ────────────────────────────────────────────────────────────
const INITIAL_MESSAGES: Record<number, Message[]> = {
  // 1. PCG大赛官方群
  1: [
    { id: 1, sender: "system", content: "hzh加入了群聊", time: "14:15", self: false, isSystem: true },
    { id: 2, sender: "system", content: "Ashley加入了群聊", time: "14:16", self: false, isSystem: true },
    { id: 3, sender: "大赛官助sasa", content: "🎉【PCG校园AI产品创意大赛·选手沟通群公告】Hi～欢迎各位参赛选手！本次大赛由腾讯PCG主办，聚焦AI Native产品方案设计与落地，旨在发掘最具创造力的校园团队。", time: "14:20", self: false },
    { id: 4, sender: "大赛官助sasa", content: "📌 重要时间节点：\n• 报名截止：5月10日 23:59\n• 初赛作品提交：5月20日 23:59\n• 决赛答辩：6月15日 线下", time: "14:21", self: false },
    { id: 5, sender: "auto_thefience", content: "好嘟好嘟😘", time: "14:25", self: false },
    { id: 6, sender: "白芨", content: "我用的腾讯送的混元大模型", time: "15:04", self: false },
    { id: 7, sender: "Ashley", content: "请问初赛是提交PPT还是Demo视频？两个都要吗", time: "15:30", self: false, date: "今天" },
    { id: 8, sender: "大赛官助小刘", content: "@Ashley 都需要：1份产品PPT（不超过20页）+ 1段Demo视频（不超过5分钟），打包发到比赛邮箱", time: "15:32", self: false },
    { id: 9, sender: "你", content: "请问可以用第三方API吗？比如GPT-4之类的", time: "15:35", self: true },
    { id: 10, sender: "大赛官助sasa", content: "@你 可以用，但是优先推荐使用腾讯混元，决赛答辩时若展示项目使用混元大模型有加分项哦～", time: "15:36", self: false },
    { id: 11, sender: "土豆片", content: "我们队还差一个产品同学，有没有想加入的呀（产品方向）", time: "15:50", self: false },
    { id: 12, sender: "幻想国", content: "+1 我们也缺个产品", time: "15:52", self: false },
    { id: 13, sender: "system", content: "云上枫加入了群聊", time: "15:08", self: false, isSystem: true },
  ],

  // 2. 王老师课题组（用户提供的科研群真实内容）
  2: [
    { id: 1, sender: "翁一士", content: "今天王闯这边会把图纸出了给到你们 @😇 @Monica 周六师妹们辛苦一下 把这周做的片子除膜除了 正好教一下师妹怎么弄 然后明天弄完把片子都寄出到江西", time: "09:32", self: false, date: "4月25日 周五" },
    { id: 2, sender: "Monica", content: "收到", time: "09:35", self: false },
    { id: 3, sender: "😇", content: "除完直接装板子寄吗", time: "09:40", self: false },
    { id: 4, sender: "翁一士", content: "之前有寄过来那种塑料的大板子\n可以放那个里面寄", time: "09:42", self: false },
    { id: 5, sender: "😇", content: "ok", time: "09:43", self: false },
    { id: 6, sender: "翁一士", content: "然后让快递好好包装", time: "09:44", self: false },
    { id: 7, sender: "王闯", content: "下周三16:30开一次组会，请要展示的同学做好准备", time: "10:15", self: false },
    { id: 8, sender: "MMMN", content: "用大的没必要吧 小的好寄点 @Monica", time: "10:30", self: false },
    { id: 9, sender: "Monica", content: "可以\n六目 去过黄了 字写在背面 没有问题我就寄了", time: "10:35", self: false },
    { id: 10, sender: "王闯", content: "OK 好的 辛苦了[强]\n寄了后 跟赵博说一声", time: "10:38", self: false },
    { id: 11, sender: "翁一士", content: "这两天带师弟师妹们 @许雯俊 @😇 先用新的单面镀增透膜的玻璃做两目二维单绿的片子 王闯稍晚点会把溶液配方和图纸发给你们 看看这个过程中有没有什么问题 随时反馈 试完后再做维信诺一维的 @哩哩（刘黎黎）", time: "11:02", self: false },
    { id: 12, sender: "哩哩（刘黎黎）", content: "好的", time: "11:05", self: false },
    { id: 13, sender: "翁一士", content: "@Yishi🦜 @王莉莉 @仲雪飞 三位老师好，五一期间，411/416/819/823有没有实验室要开展实验活动？学院要统计\n51有同学会有需要做实验吗？", time: "14:20", self: false, date: "4月27日 周日" },
    { id: 14, sender: "你", content: "xitai的片子是同一天做的吗？曝光是一个同学吗 @哩哩（刘黎黎）", time: "15:00", self: true, atMe: false },
    { id: 15, sender: "哩哩（刘黎黎）", content: "不是同一天，有一半是一天做的，曝光是两个人，同一天仅一个人曝光", time: "15:08", self: false },
    { id: 16, sender: "你", content: "横向周期设计的多少，有测过吗？\n单片光栅有色散，这边测了入出横向周期差10nm", time: "15:15", self: true },
    { id: 17, sender: "哩哩（刘黎黎）", content: "412nm的横向周期\n这边测过的", time: "15:20", self: false },
    { id: 18, sender: "你", content: "入和出横向周期为什么会差啊？", time: "15:22", self: true },
    { id: 19, sender: "哩哩（刘黎黎）", content: "我也没想明白，有好有坏。另外下面的载具可以旋转0.5度，具体逆时针还是顺时针需要封一下看看。", time: "15:35", self: false },
    { id: 20, sender: "翁一士", content: "新生我记得之前教过一个人封过，可以找他试试。", time: "15:42", self: false },
    { id: 21, sender: "你", content: "👌", time: "15:45", self: true },
    { id: 22, sender: "翁一士", content: "明日组会线上[旺柴][强]", time: "16:20", self: false, date: "今天" },
    { id: 23, sender: "王闯", content: "[旺柴][强]", time: "16:21", self: false },
    { id: 24, sender: "MMMN", content: "光阑是松的 动了光阑后 光斑位置变了\n。。。。。", time: "16:25", self: false },
    { id: 25, sender: "翁一士", content: "翁一士 邀请您参加腾讯会议\n📞 会议主题：429组会\n🕐 会议时间：2026/04/29 16:30-19:30 (GMT+08:00)\n🔗 点击链接入会，或添加至会议列表", time: "16:32", self: false, atMe: true },
  ],

  // 3. 张师兄（私聊）
  3: [
    { id: 1, sender: "张师兄", content: "在吗师弟，最近实验进展怎么样", time: "09:15", self: false, date: "今天" },
    { id: 2, sender: "你", content: "在的师兄！上周做的两组样品已经测完，结果还行，但是横向周期偏差有点大", time: "09:20", self: true },
    { id: 3, sender: "张师兄", content: "偏差多少", time: "09:21", self: false },
    { id: 4, sender: "你", content: "10nm左右，比预期大", time: "09:22", self: true },
    { id: 5, sender: "张师兄", content: "嗯，可能是曝光那边的问题，下次可以试试调一下载具角度", time: "09:30", self: false },
    { id: 6, sender: "张师兄", content: "对了下午的图纸我整理一下，3点前发你", time: "14:10", self: false },
    { id: 7, sender: "你", content: "好嘞！师兄辛苦", time: "14:11", self: true },
    { id: 8, sender: "张师兄", content: "图纸我下午发你", time: "15:42", self: false },
  ],

  // 4. 计网课程群
  4: [
    { id: 1, sender: "张老师", content: "同学们晚上好，本周的课程内容是 TCP/UDP 协议详解，预习材料已上传至学习通", time: "20:15", self: false, date: "4月22日 周二" },
    { id: 2, sender: "王同学", content: "老师，课件可以发PDF版的吗？PPT在我ipad上打不开", time: "20:30", self: false },
    { id: 3, sender: "张老师", content: "好的，我转成PDF再上传一份", time: "20:35", self: false },
    { id: 4, sender: "助教 陈学长", content: "📌 第三章作业已发布：\n1. 完成课后习题3.1-3.8\n2. 编程题：实现简易TCP三次握手模拟\n3. 提交格式：word + 代码压缩包\n4. 截止时间：5月9日 23:59", time: "10:00", self: false, date: "4月25日 周五" },
    { id: 5, sender: "你", content: "@助教 陈学长 请问编程题用Python还是C都可以吗", time: "10:30", self: true },
    { id: 6, sender: "助教 陈学长", content: "@你 都可以，附上简要的注释和运行截图就行", time: "10:32", self: false },
    { id: 7, sender: "李同学", content: "请问DDL会延期吗，五一假期写不完啊😭", time: "11:00", self: false },
    { id: 8, sender: "助教 陈学长", content: "DDL不延期哦，五一前可以提前写", time: "11:05", self: false },
    { id: 9, sender: "张老师", content: "📢 重要通知：本周四（4月30日）下午的课调到 教三-204，时间不变下午14:00开始", time: "14:00", self: false, date: "4月28日 周一" },
    { id: 10, sender: "陈同学", content: "收到老师！", time: "14:02", self: false },
    { id: 11, sender: "你", content: "收到", time: "14:05", self: true },
    { id: 12, sender: "张老师", content: "再次提醒：第三章课后作业本周五（5月9日）23:59前提交，word格式，不少于3000字，发到课程邮箱，并同步提交到学习通平台", time: "14:20", self: false, date: "今天" },
    { id: 13, sender: "助教 陈学长", content: "补充：不接受补交，请大家务必提前完成", time: "14:22", self: false },
  ],

  // 5. 数据结构课程群
  5: [
    { id: 1, sender: "李老师", content: "🌟 本周实验：实现红黑树的插入、删除与查找操作", time: "08:30", self: false, date: "4月21日 周一" },
    { id: 2, sender: "李老师", content: "实验报告模板已上传，请大家下载使用", time: "08:31", self: false },
    { id: 3, sender: "助教", content: "[文件] 实验报告模板.docx", time: "08:32", self: false },
    { id: 4, sender: "刘同学", content: "老师，红黑树的旋转操作可以画图说明吗？", time: "10:15", self: false },
    { id: 5, sender: "李老师", content: "可以，建议使用draw.io或者手绘扫描", time: "10:20", self: false },
    { id: 6, sender: "你", content: "实验DDL是哪天？", time: "11:00", self: true },
    { id: 7, sender: "助教", content: "@你 5月15日24点", time: "11:05", self: false },
    { id: 8, sender: "周同学", content: "[图片]", time: "11:08", self: false, date: "今天" },
    { id: 9, sender: "周同学", content: "我画的红黑树插入流程图，有不对的地方请大佬们指正🤝", time: "11:09", self: false },
  ],

  // 6. 操作系统课程群
  6: [
    { id: 1, sender: "助教", content: "实验3报告模板已上传到课程网站，注意本次实验需要现场答辩", time: "16:20", self: false, date: "昨天" },
    { id: 2, sender: "刘同学", content: "答辩什么时候", time: "16:25", self: false },
    { id: 3, sender: "助教", content: "下周三（5月7日）下午14:00-17:00，机房405", time: "16:30", self: false },
    { id: 4, sender: "你", content: "好的", time: "16:32", self: true },
  ],

  // 7. 班级群
  7: [
    { id: 1, sender: "班长 李同学", content: "📢【班费收缴通知】\n各位同学，本学期班费每人150元，用于:\n• 班级活动经费\n• 毕业纪念品\n• 节日生日福利\n请于5月15日前转账到我的支付宝（截图发我）", time: "10:30", self: false, date: "今天" },
    { id: 2, sender: "你", content: "好的，下午就转", time: "10:35", self: true },
    { id: 3, sender: "王同学", content: "收到👌", time: "10:38", self: false },
    { id: 4, sender: "李同学", content: "另外咱们班团建定在5月18日（周日），地点紫金山徒步+晚饭，去的同学接龙一下！", time: "10:45", self: false },
    { id: 5, sender: "陈同学", content: "1. 陈\n2. 王\n3. 你", time: "10:50", self: false },
  ],

  // 8. 学院群
  8: [
    { id: 1, sender: "教务老师", content: "【毕业论文盲审说明】\n各位2026届的同学：\n1. 论文初稿提交截止：5月20日\n2. 盲审起止：5月25日 - 6月10日\n3. 答辩时间：6月15-18日\n请大家按时提交，逾期视为放弃答辩资格", time: "16:00", self: false, date: "昨天" },
    { id: 2, sender: "学院辅导员", content: "另外提醒下，毕业生离校手续清单已发到各班群，请尽早办理", time: "16:30", self: false },
  ],

  // 9. Team Phoenix 创新创业大赛
  9: [
    { id: 1, sender: "你", content: "我把PPT v3发群里了，大家看看", time: "11:20", self: true, date: "今天" },
    { id: 2, sender: "你", content: "[文件] Team Phoenix_产品方案_v3.pptx", time: "11:21", self: true },
    { id: 3, sender: "队友 王", content: "我看了，第8页商业模式那块有点单薄", time: "11:35", self: false },
    { id: 4, sender: "队友 刘", content: "+1 还有用户画像可以再具体点", time: "11:40", self: false },
    { id: 5, sender: "你", content: "好，我再补充一下，今晚改完发新版", time: "11:45", self: true },
    { id: 6, sender: "队友 周", content: "提醒大家：初赛截止5月6日23:59，下周一前要把所有材料定稿！", time: "13:00", self: false },
    { id: 7, sender: "队友 周", content: "@全体成员 ⏰ 还剩 5 天", time: "13:01", self: false, atMe: true },
    { id: 8, sender: "你", content: "收到，加油！", time: "13:22", self: true },
  ],

  // 10. 队友刘正昂（私聊）
  10: [
    { id: 1, sender: "刘正昂", content: "兄弟在不", time: "23:30", self: false, date: "昨天" },
    { id: 2, sender: "刘正昂", content: "PPT那个用户调研图我加了几个数据", time: "23:35", self: false },
    { id: 3, sender: "刘正昂", content: "[图片]", time: "01:48", self: false },
    { id: 4, sender: "你", content: "明天看，先睡了😪", time: "06:50", self: true, date: "今天" },
  ],

  // 11. 摄影社
  11: [
    { id: 1, sender: "社长小明", content: "周六外拍活动改到下午3点，地点不变还是玄武湖", time: "15:20", self: false, date: "昨天" },
    { id: 2, sender: "你", content: "收到！", time: "15:22", self: true },
    { id: 3, sender: "社长小明", content: "对了，周六外拍地点也改了，改到情人谷，人少一点风景好。集合地点：地铁2号线下马坊站A出口 14:30", time: "19:45", self: false },
    { id: 4, sender: "社员小张", content: "👍", time: "19:46", self: false },
    { id: 5, sender: "你", content: "好的", time: "19:50", self: true },
  ],

  // 12. 学生会
  12: [
    { id: 1, sender: "宣传部长", content: "[文件] 5月活动排期.xlsx", time: "10:00", self: false, date: "周一" },
    { id: 2, sender: "宣传部长", content: "5月有3场活动需要宣传组的同学：\n• 5/10 校园歌手大赛\n• 5/18 创新创业讲座\n• 5/25 毕业生晚会\n大家自愿认领，发我私聊", time: "10:05", self: false },
  ],

  // 13. 小美（私聊）
  13: [
    { id: 1, sender: "小美", content: "在吗在吗！下周末有空不", time: "10:00", self: false, date: "4月26日 周六" },
    { id: 2, sender: "你", content: "在！干啥", time: "10:05", self: true },
    { id: 3, sender: "小美", content: "组个出游呀，叫上小红，我们三个好久没出来玩了", time: "10:08", self: false },
    { id: 4, sender: "你", content: "好啊好啊，去哪？", time: "10:10", self: true },
    { id: 5, sender: "小美", content: "我也没想好，玄武湖？中山陵？", time: "10:12", self: false },
    { id: 6, sender: "你", content: "中山陵吧，没去过", time: "10:15", self: true },
    { id: 7, sender: "小美", content: "行！我问下小红", time: "10:18", self: false },
    { id: 8, sender: "小美", content: "周末出游定了吗？我周六下午有空", time: "11:30", self: false, date: "今天" },
    { id: 9, sender: "小红", content: "我周六上午有课，下午可以", time: "11:32", self: false },
    { id: 10, sender: "你", content: "那就周六下午？去哪？", time: "11:33", self: true },
    { id: 11, sender: "小美", content: "不是说好中山陵了吗哈哈哈", time: "11:35", self: false },
    { id: 12, sender: "你", content: "对对对忘了😅", time: "11:36", self: true },
    { id: 13, sender: "你", content: "下午2点地铁站集合？", time: "11:37", self: true },
    { id: 14, sender: "小美", content: "👍 中山陵下午2点见", time: "11:38", self: false },
    { id: 15, sender: "小红", content: "好的", time: "11:38", self: false },
  ],

  // 14. 班长（私聊）
  14: [
    { id: 1, sender: "班长 李同学", content: "兄弟，班费150记得交一下", time: "10:50", self: false, date: "今天" },
    { id: 2, sender: "班长 李同学", content: "另外团建你去吗？要的话给你登记一下", time: "10:51", self: false },
  ],

  // 15. 妈妈（私聊）
  15: [
    { id: 1, sender: "妈妈", content: "孩子，妈给你寄了点家里的腊肉，明后天到", time: "18:30", self: false, date: "昨天" },
    { id: 2, sender: "你", content: "好嘞！谢谢妈", time: "18:35", self: true },
    { id: 3, sender: "妈妈", content: "记得吃饭啊孩子，别老吃外卖", time: "21:00", self: false },
  ],

  // 16. 摆烂群
  16: [
    { id: 1, sender: "宿舍老二", content: "今天又没去图书馆", time: "15:20", self: false, date: "昨天" },
    { id: 2, sender: "宿舍老三", content: "我也是，论文一个字没写", time: "15:22", self: false },
    { id: 3, sender: "你", content: "看了一天b站😇", time: "15:30", self: true },
  ],

  // 17. 志愿者群
  17: [
    { id: 1, sender: "活动部小张", content: "5/12志愿排班已出，请大家在群文件查看", time: "14:00", self: false, date: "周日" },
    { id: 2, sender: "你", content: "收到", time: "14:30", self: true },
  ],
};

// ────────────────────────────────────────────────────────────
//  课表数据（基于图4）+ 自定义日程
// ────────────────────────────────────────────────────────────
const COURSE_COLORS = ["#FFE4E1", "#E0F4D6", "#E0E7FF", "#FFE7BA", "#E6F7FF", "#FFF1F0", "#F9F0FF", "#FCFFE6"];

const INITIAL_SCHEDULE: ScheduleEvent[] = [
  // 周一 (4/27)
  { id: 1, date: "2026-04-27", startTime: "10:10", endTime: "12:00", title: "柔力球", location: "乒乓球房东", type: "class", color: "#FCE4EC" },
  { id: 2, date: "2026-04-27", startTime: "14:00", endTime: "15:50", title: "世界政治文献精读（下）", location: "逸C-102", type: "class", color: "#FFFDE7" },
  // 周二 (4/28)
  { id: 3, date: "2026-04-28", startTime: "10:10", endTime: "12:00", title: "政治学原理", location: "教222", type: "class", color: "#E0F2F1" },
  { id: 4, date: "2026-04-28", startTime: "14:00", endTime: "15:50", title: "国际组织", location: "逸B-210", type: "class", color: "#E8F5E9" },
  { id: 5, date: "2026-04-28", startTime: "16:10", endTime: "17:00", title: "南亚研究", location: "逸B-210", type: "class", color: "#FFF3E0" },
  { id: 6, date: "2026-04-28", startTime: "18:30", endTime: "20:20", title: "社会工作", location: "新教", type: "class", color: "#F3E5F5" },
  // 周三 (4/29) - 今天
  { id: 7, date: "2026-04-29", startTime: "10:10", endTime: "11:00", title: "国家安全学", location: "逸C-114", type: "class", color: "#E3F2FD" },
  { id: 8, date: "2026-04-29", startTime: "18:30", endTime: "20:20", title: "中国近现...", location: "逸B...", type: "class", color: "#E1F5FE" },
  // 周四 (4/30)
  { id: 9, date: "2026-04-30", startTime: "10:10", endTime: "11:00", title: "中国政治与外交", location: "逸C-103", type: "class", color: "#FFFDE7" },
  { id: 10, date: "2026-04-30", startTime: "18:30", endTime: "19:20", title: "万物起源", location: "仙I-109", type: "class", color: "#E1F5FE" },
  // 周五 (5/1)
  { id: 11, date: "2026-05-01", startTime: "08:00", endTime: "09:50", title: "国际交流英语", location: "逸C-105", type: "class", color: "#F1F8E9" },
  { id: 12, date: "2026-05-01", startTime: "14:00", endTime: "15:50", title: "西方政治思想史II", location: "逸C-104", type: "class", color: "#F3E5F5" },
  { id: 13, date: "2026-05-01", startTime: "18:30", endTime: "19:20", title: "社会保障概论", location: "教1209", type: "class", color: "#FFF3E0" },
];

// ────────────────────────────────────────────────────────────
//  时间胶囊样式与初始数据
// ────────────────────────────────────────────────────────────
const CAPSULE_STYLES: Record<string, any> = {
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
    scheduleData: { date: "2026-04-30", startTime: "14:00", endTime: "16:00", title: "🔄 计网课（教三-204）", type: "class", color: "#E6F7FF" }
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
    id: 106, type: "pending", group: "王老师课题组", title: "🔬 周三组会",
    content: "4月29日 16:30-19:30\n腾讯会议线上",
    time: "16:32", from: "翁一士", new: true,
    scheduleData: { date: "2026-04-29", startTime: "16:30", endTime: "19:30", title: "🔬 课题组组会(线上)", type: "event", color: "#F9F0FF" }
  },
];

// ────────────────────────────────────────────────────────────
//  AI 提醒文案风格
// ────────────────────────────────────────────────────────────
const REMINDER_STYLES = [
  { label: "温柔学姐风", icon: "🌸", text: "亲爱的，产品赛截止还有6小时哦～记得检查一下材料，加油！" },
  { label: "毒舌室友风", icon: "😤", text: "别睡了！产品赛还剩6小时，再不交直接退赛算了，哈哈开玩笑的，快写！" },
  { label: "佛系朋友风", icon: "🧘", text: "嗯……产品赛好像快截止了。交不交都行吧，不过……还是交一下？" },
  { label: "正经班委风", icon: "📋", text: "提醒：产品创意大赛初赛作品提交截止时间为今日24:00，请务必在规定时间内完成提交。" },
];

// ────────────────────────────────────────────────────────────
//  AI 总结模板（私聊辅助）
// ────────────────────────────────────────────────────────────
const AI_QUICK_PROMPTS = [
  { icon: "📝", label: "总结对话要点" },
  { icon: "📅", label: "提取所有时间安排" },
  { icon: "✅", label: "生成待办清单" },
  { icon: "💡", label: "给点回复建议" },
];

// ────────────────────────────────────────────────────────────
//  日期工具
// ────────────────────────────────────────────────────────────
const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const TIME_SLOTS = [
  { label: "1-2节", start: "08:00", end: "09:50" },
  { label: "3-4节", start: "10:10", end: "12:00" },
  { label: "5-6节", start: "14:00", end: "15:50" },
  { label: "7-8节", start: "16:10", end: "18:00" },
  { label: "9-11节", start: "18:30", end: "21:20" },
];

const WEEK_DATES = ["2026-04-27", "2026-04-28", "2026-04-29", "2026-04-30", "2026-05-01", "2026-05-02", "2026-05-03"];
const WEEK_LABELS = ["27", "28", "29", "30", "1", "2", "3"];
const TODAY = "2026-04-29";

// ────────────────────────────────────────────────────────────
//  组件
// ────────────────────────────────────────────────────────────
export default function QCapsuleDemo() {
  const [activeChat, setActiveChat] = useState<number>(2); // 默认打开科研组
  const [messages, setMessages] = useState<Record<number, Message[]>>(INITIAL_MESSAGES);
  const [capsules, setCapsules] = useState<Capsule[]>(INITIAL_CAPSULES);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>(INITIAL_SCHEDULE);
  const [newCapsuleIds, setNewCapsuleIds] = useState<number[]>([101, 102, 103, 105, 106]);
  const [dailyReport, setDailyReport] = useState<boolean>(false);
  const [reminderModal, setReminderModal] = useState<boolean>(false);
  const [selectedStyle, setSelectedStyle] = useState<number>(0);
  const [sentReminder, setSentReminder] = useState<boolean>(false);
  const [scheduleModal, setScheduleModal] = useState<boolean>(false);
  const [flyingCapsule, setFlyingCapsule] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [rightTab, setRightTab] = useState<"schedule" | "capsule">("schedule");
  const [aiPanel, setAiPanel] = useState<boolean>(false);
  const [aiInput, setAiInput] = useState<string>("");
  const [aiHistory, setAiHistory] = useState<{ role: string; content: string }[]>([]);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [searchKw, setSearchKw] = useState<string>("");
  const [importCourseModal, setImportCourseModal] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChat]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiHistory, aiThinking]);

  const showToast = (msg: string, color: string = "#52C41A") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  // ────────────── 模拟事件 ──────────────
  const simulateDDL = () => {
    setActiveChat(4); // 切到计网课程群
    setTimeout(() => {
      const newMsg: Message = {
        id: Date.now(),
        sender: "张老师",
        content: "再次补充：作业请同步上传到学习通平台，截止时间5月9日23:59，不接受补交！",
        time: "22:05",
        self: false,
      };
      setMessages(prev => ({ ...prev, 4: [...(prev[4] || []), newMsg] }));
    }, 400);
    setTimeout(() => {
      const cap: Capsule = {
        id: Date.now(),
        type: "pending",
        group: "计算机网络 · 课程群",
        title: "📎 作业补充要求",
        content: "学习通也要交！5/9 23:59 截止，不接受补交",
        time: "22:05",
        from: "张老师",
        new: true,
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

  const simulateConflict = () => {
    setActiveChat(7);
    setTimeout(() => {
      const newMsg: Message = {
        id: Date.now(),
        sender: "班长 李同学",
        content: "再次确认：5月18日 紫金山团建，全天活动，要去的报名",
        time: "20:20",
        self: false,
      };
      setMessages(prev => ({ ...prev, 7: [...(prev[7] || []), newMsg] }));
    }, 400);
    setTimeout(() => {
      const cap: Capsule = {
        id: Date.now(),
        type: "conflict",
        group: "班级群 × 创新创业大赛",
        title: "🚨 5/18 时间冲突",
        content: "5/18 紫金山团建（全天）\n5/18 创新创业讲座（10:00-12:00）\n两者重叠，需取舍",
        time: "20:20",
        from: "AI 冲突检测",
        new: true,
      };
      setCapsules(prev => [cap, ...prev]);
      setNewCapsuleIds(prev => [cap.id, ...prev]);
      setFlyingCapsule(cap.id);
      setRightTab("capsule");
      setTimeout(() => setFlyingCapsule(null), 800);
      showToast("🔴 冲突检测！已生成红色胶囊", "#FF4D4F");
    }, 1100);
  };

  const showDailyReport = () => setDailyReport(true);

  const simulateSchedule = () => {
    setActiveChat(13);
    setTimeout(() => {
      const newMsg: Message = {
        id: Date.now(),
        sender: "你",
        content: "@Q仔 帮我们约个周末出游，2小时左右",
        time: "12:00",
        self: true,
      };
      setMessages(prev => ({ ...prev, 13: [...(prev[13] || []), newMsg] }));
      setTimeout(() => {
        const qMsg: Message = {
          id: Date.now() + 1,
          sender: "Q仔",
          isAI: true,
          content: "好的！我已询问群内成员参与意愿，基于大家已授权的日程（仅显示交集，不展示个人安排），为你们找到 3 个共同空闲时段：\n\n① 本周六 14:00–16:00\n② 本周日 10:00–12:00\n③ 下周六 15:00–17:00\n\n任一人点击确认即可写入所有人日程 👇",
          time: "12:00",
          self: false,
        };
        setMessages(prev => ({ ...prev, 13: [...(prev[13] || []), qMsg] }));
        setScheduleModal(true);
      }, 700);
    }, 400);
  };

  // ────────────── 胶囊操作 ──────────────
  const confirmCapsule = (id: number) => {
    const cap = capsules.find(c => c.id === id);
    setCapsules(prev => prev.map(c => (c.id === id ? { ...c, type: "confirmed", new: false } : c)));
    setNewCapsuleIds(prev => prev.filter(i => i !== id));

    // 自动写入日程表
    if (cap?.scheduleData) {
      const event: ScheduleEvent = {
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
      setSchedule(prev => [...prev, event]);
      showToast("✅ 胶囊已确认，已自动写入日程表", "#52C41A");
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

  // ────────────── AI 辅助 ──────────────
  const askAI = (prompt: string) => {
    const currentMsgs = messages[activeChat] || [];
    setAiHistory(prev => [...prev, { role: "user", content: prompt }]);
    setAiThinking(true);
    setAiInput("");

    setTimeout(() => {
      let response = "";
      const chat = CHATS.find(c => c.id === activeChat);

      if (prompt.includes("总结") || prompt.includes("要点")) {
        if (activeChat === 13) {
          response = "📌 与 小美 的对话要点总结：\n\n1. 出游计划：周六下午出游中山陵\n2. 参与人员：你、小美、小红\n3. 集合时间：14:00\n4. 集合地点：中山陵地铁站\n5. 状态：✅ 三人均已确认\n\n是否要把这个安排加入日程表？";
        } else if (activeChat === 3) {
          response = "📌 与 张师兄 的对话要点：\n\n1. 上周两组样品测试完成\n2. 横向周期偏差较大（约10nm）\n3. 师兄建议：调整曝光载具角度\n4. 师兄今天下午3点前发图纸\n5. 当前状态：等待图纸\n\n建议：可以提前准备好下周实验材料。";
        } else {
          response = `📌 ${chat?.name} 最近对话要点：\n\n• 共 ${currentMsgs.length} 条消息\n• 已识别关键时间节点 2 个\n• 已识别 1 个待办事项\n• 已识别 0 个时间冲突\n\n详细内容已生成，需要展开吗？`;
        }
      } else if (prompt.includes("时间") || prompt.includes("安排")) {
        response = "📅 提取到的时间安排：\n\n• 周六 14:00 中山陵地铁站集合\n• 周六 14:00-18:00 中山陵游玩\n\n是否一键加入日程表？点击下方按钮确认。";
      } else if (prompt.includes("待办") || prompt.includes("清单")) {
        response = "✅ 为你生成待办清单：\n\n☐ 周五前确认天气\n☐ 周六12:30 出发前往集合点\n☐ 准备好水、零食\n☐ 充满手机电量带充电宝\n\n要把这些加到日程提醒里吗？";
      } else if (prompt.includes("回复建议") || prompt.includes("回复")) {
        response = "💡 三种回复风格供你选择：\n\n【积极型】\n「好的！我提前到，到了发你定位📍」\n\n【调侃型】\n「行行行，又是我打头阵🤡」\n\n【确认型】\n「OK 周六下午2点 中山陵地铁站 不见不散」";
      } else {
        response = `我帮你看看这段对话——\n\n根据 ${chat?.name} 的最近 ${currentMsgs.length} 条消息，主要在讨论 ${chat?.category} 相关内容。\n\n你想让我具体做什么？比如：\n• 总结要点\n• 提取时间\n• 给回复建议\n• 检查时间冲突`;
      }
      setAiHistory(prev => [...prev, { role: "ai", content: response }]);
      setAiThinking(false);
    }, 900);
  };

  // ────────────── 渲染辅助 ──────────────
  const currentChat = CHATS.find(c => c.id === activeChat);
  const filteredChats = CHATS.filter(c => !searchKw || c.name.toLowerCase().includes(searchKw.toLowerCase()));
  const pendingCount = capsules.filter(c => c.type === "pending" || c.type === "conflict").length;
  const totalUnread = CHATS.reduce((s, c) => s + c.unread, 0);

  // 当天日程
  const todayEvents = schedule.filter(e => e.date === TODAY).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const upcomingEvents = schedule
    .filter(e => e.date >= TODAY)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 6);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#F0F2F5", fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif", overflow: "hidden", position: "relative", color: "#333" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "#fff", padding: "10px 22px", borderRadius: 24, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", animation: "fadeInDown 0.3s ease" }}>
          {toast.msg}
        </div>
      )}

      {/* ═══════════════ 最左侧 QQ 导航条 ═══════════════ */}
      <div style={{ width: 56, background: "linear-gradient(180deg, #2D3138 0%, #1F2329 100%)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 4 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #4A90D9, #7B68EE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12, border: "2px solid #fff" }}>小A</div>
        {[
          { icon: "💬", label: "消息", active: true, badge: totalUnread },
          { icon: "👥", label: "联系人" },
          { icon: "📁", label: "文件" },
          { icon: "🎮", label: "游戏" },
          { icon: "📅", label: "日程" },
        ].map((item, i) => (
          <div key={i} style={{ position: "relative", width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", background: item.active ? "rgba(74,144,217,0.2)" : "transparent", color: item.active ? "#4A90D9" : "#9DA1A6" }}>
            {item.icon}
            {item.badge && item.badge > 0 ? (
              <div style={{ position: "absolute", top: -2, right: -2, background: "#FF4D4F", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 8, minWidth: 16, textAlign: "center" }}>{item.badge}</div>
            ) : null}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #4A90D9, #9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Q</div>
      </div>

      {/* ═══════════════ 聊天列表 ═══════════════ */}
      <div style={{ width: 280, background: "#fff", borderRight: "1px solid #E5E5E5", display: "flex", flexDirection: "column" }}>
        {/* 搜索框 */}
        <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 30, background: "#F5F5F5", borderRadius: 6, padding: "0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#999" }}>🔍</span>
            <input
              value={searchKw}
              onChange={e => setSearchKw(e.target.value)}
              placeholder="搜索"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12.5, color: "#333" }}
            />
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#666", cursor: "pointer" }}>+</div>
        </div>

        {/* 聊天列表 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredChats.map(chat => {
            const lastMsgs = messages[chat.id] || [];
            const previewMsg = lastMsgs.length ? lastMsgs[lastMsgs.length - 1] : null;
            const previewText = previewMsg
              ? previewMsg.isSystem
                ? previewMsg.content
                : `${previewMsg.self ? "" : (previewMsg.sender + ": ")}${previewMsg.content.replace(/\n/g, " ").slice(0, 20)}`
              : chat.lastMsg;
            return (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  background: activeChat === chat.id ? "#E8F0FE" : chat.pinned ? "#FAFBFD" : "transparent",
                  borderBottom: "1px solid #F5F5F5",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (activeChat !== chat.id) (e.currentTarget as HTMLElement).style.background = "#F5F7FA"; }}
                onMouseLeave={e => { if (activeChat !== chat.id) (e.currentTarget as HTMLElement).style.background = chat.pinned ? "#FAFBFD" : "transparent"; }}
              >
                {/* 头像 */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: chat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: chat.avatar.length > 1 ? 18 : 16, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                    {chat.avatar}
                  </div>
                  {chat.online && (
                    <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "#52C41A", border: "2px solid #fff" }} />
                  )}
                </div>
                {/* 信息 */}
                <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                      {chat.pinned && <span style={{ color: "#FA8C16", marginRight: 3, fontSize: 10 }}>📌</span>}
                      {chat.name}
                    </span>
                    <span style={{ fontSize: 10.5, color: "#999", marginLeft: 6, flexShrink: 0 }}>{chat.lastTime}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11.5, color: "#999", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                      {previewText}
                    </span>
                    {chat.unread > 0 && (
                      <div style={{ background: "#FF4D4F", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center", marginLeft: 4 }}>
                        {chat.unread > 99 ? "99+" : chat.unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部 Q 仔状态 */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 8, background: "#FAFBFD" }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg, #4A90D9, #9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>Q</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#4A90D9" }}>Q 仔时间胶囊</div>
            <div style={{ fontSize: 10, color: "#999" }}>静默监听中 · 已抓 {capsules.length} 个胶囊</div>
          </div>
          {pendingCount > 0 && <div style={{ background: "#FA8C16", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8 }}>{pendingCount}</div>}
        </div>
      </div>

      {/* ═══════════════ 中间聊天区 ═══════════════ */}
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
              <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                {currentChat?.type === "private" ? (currentChat.online ? "● 在线" : "离线") : `${currentChat?.category}群`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 11, color: "#4A90D9", background: "#E8F0FE", padding: "4px 10px", borderRadius: 12, border: "1px solid #BAE0FF", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#52C41A", display: "inline-block" }} />
              Q仔监听中
            </div>
            <span style={{ fontSize: 16, color: "#999", cursor: "pointer" }}>📞</span>
            <span style={{ fontSize: 16, color: "#999", cursor: "pointer" }}>📹</span>
            <span style={{ fontSize: 16, color: "#999", cursor: "pointer" }}>⋯</span>
          </div>
        </div>

        {/* 消息区 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          {(messages[activeChat] || []).map((msg, idx) => {
            // 日期分割
            const dateBreak = msg.date && (idx === 0 || messages[activeChat][idx - 1]?.date !== msg.date);
            // 系统消息
            if (msg.isSystem) {
              return (
                <div key={msg.id}>
                  {dateBreak && (
                    <div style={{ textAlign: "center", margin: "16px 0 12px", fontSize: 11, color: "#999" }}>
                      <span style={{ background: "#E5E8EE", padding: "3px 12px", borderRadius: 10 }}>{msg.date}</span>
                    </div>
                  )}
                  <div style={{ textAlign: "center", margin: "6px 0", fontSize: 11, color: "#999" }}>{msg.content}</div>
                </div>
              );
            }
            return (
              <div key={msg.id}>
                {dateBreak && (
                  <div style={{ textAlign: "center", margin: "16px 0 12px", fontSize: 11, color: "#999" }}>
                    <span style={{ background: "#E5E8EE", padding: "3px 12px", borderRadius: 10 }}>{msg.date}</span>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: msg.self ? "row-reverse" : "row", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  {/* 头像 */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                    background: msg.isAI ? "linear-gradient(135deg, #4A90D9, #9B59B6)" : msg.self ? "linear-gradient(135deg, #4A90D9, #7B68EE)" : `hsl(${(msg.sender.charCodeAt(0) * 17) % 360}, 60%, 60%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#fff",
                  }}>
                    {msg.isAI ? "Q" : msg.self ? "我" : msg.sender.slice(0, 1)}
                  </div>
                  {/* 气泡 */}
                  <div style={{ maxWidth: "62%", display: "flex", flexDirection: "column", alignItems: msg.self ? "flex-end" : "flex-start" }}>
                    {!msg.self && (
                      <div style={{ fontSize: 11, color: msg.isAI ? "#4A90D9" : "#666", marginBottom: 3, fontWeight: msg.isAI ? 600 : 400 }}>
                        {msg.isAI ? "Q 仔 · AI助手" : msg.sender}
                        <span style={{ color: "#bbb", marginLeft: 6, fontSize: 10 }}>{msg.time}</span>
                      </div>
                    )}
                    <div style={{
                      padding: "8px 12px",
                      borderRadius: msg.self ? "10px 4px 10px 10px" : "4px 10px 10px 10px",
                      background: msg.self ? "#A6D8FF" : msg.isAI ? "linear-gradient(135deg, #F0F7FF, #F5F0FF)" : "#fff",
                      color: "#333",
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      border: msg.atMe ? "1.5px solid #FA8C16" : msg.isAI ? "1px solid #BAE0FF" : "1px solid #EAEAEA",
                      whiteSpace: "pre-line",
                      wordBreak: "break-word",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}>
                      {msg.content}
                    </div>
                    {msg.self && (
                      <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>{msg.time}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* 底部输入框 */}
        <div style={{ background: "#fff", borderTop: "1px solid #E5E5E5" }}>
          {/* 工具栏 */}
          <div style={{ padding: "8px 16px 4px", display: "flex", alignItems: "center", gap: 14, fontSize: 16 }}>
            <span style={{ cursor: "pointer", color: "#666" }}>😀</span>
            <span style={{ cursor: "pointer", color: "#666" }}>✂️</span>
            <span style={{ cursor: "pointer", color: "#666" }}>📁</span>
            <span style={{ cursor: "pointer", color: "#666" }}>🖼️</span>
            <span style={{ cursor: "pointer", color: "#666" }}>📨</span>
            <span style={{ cursor: "pointer", color: "#666" }}>🎤</span>
            <div style={{ flex: 1 }} />
            {/* 私聊时显示 AI 辅助按钮 */}
            {currentChat?.type === "private" && (
              <button
                onClick={() => { setAiPanel(!aiPanel); if (!aiPanel) setAiHistory([]); }}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 10px",
                  background: aiPanel ? "linear-gradient(135deg, #4A90D9, #7B68EE)" : "linear-gradient(135deg, #4A90D922, #7B68EE22)",
                  color: aiPanel ? "#fff" : "#4A90D9",
                  border: `1px solid ${aiPanel ? "transparent" : "#BAE0FF"}`,
                  borderRadius: 12,
                  fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                }}
              >
                ✨ AI 辅助
              </button>
            )}
            <span style={{ cursor: "pointer", color: "#666", fontSize: 14 }}>⏰</span>
          </div>
          {/* 输入区 */}
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ minHeight: 56, padding: "8px 12px", background: "#F8F9FB", borderRadius: 6, border: "1px solid #EAEAEA", fontSize: 12.5, color: "#bbb" }}>
              输入消息…
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <button style={{ padding: "5px 18px", borderRadius: 4, border: "1px solid #4A90D9", background: "#fff", color: "#4A90D9", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 8 }}>
                Ctrl+Enter
              </button>
              <button style={{ padding: "5px 18px", borderRadius: 4, border: "none", background: "linear-gradient(135deg, #4A90D9, #2563EB)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                发送 ▾
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ 右侧 日程表 / 时间胶囊 ═══════════════ */}
      <div style={{ width: 360, background: "#fff", borderLeft: "1px solid #E5E5E5", display: "flex", flexDirection: "column" }}>
        {/* Tab 切换 */}
        <div style={{ display: "flex", borderBottom: "1px solid #E5E5E5", background: "#FAFBFD" }}>
          {[
            { key: "schedule", label: "📅 日程表", count: schedule.length },
            { key: "capsule", label: "🟡 时间胶囊", count: pendingCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setRightTab(tab.key as any)}
              style={{
                flex: 1, padding: "12px", border: "none",
                background: rightTab === tab.key ? "#fff" : "transparent",
                color: rightTab === tab.key ? "#4A90D9" : "#666",
                fontSize: 12.5, fontWeight: rightTab === tab.key ? 700 : 500,
                cursor: "pointer",
                borderBottom: rightTab === tab.key ? "2px solid #4A90D9" : "2px solid transparent",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{ background: rightTab === tab.key ? "#4A90D9" : "#FA8C16", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8 }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── 日程表面板 ─── */}
        {rightTab === "schedule" && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {/* 顶部日期切换 + 导入 */}
            <div style={{ padding: "14px 16px 10px", background: "linear-gradient(135deg, #F5F0FF 0%, #FFF0F5 100%)", borderBottom: "1px solid #F0F0F0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#9B59B6", fontWeight: 600 }}>2024-2025学年 第2学期</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#333", marginTop: 2 }}>4月27日 - 5月3日 <span style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>第10周</span></div>
                </div>
                <button
                  onClick={() => setImportCourseModal(true)}
                  style={{ padding: "5px 12px", borderRadius: 14, border: "1.5px solid #9B59B6", background: "#fff", color: "#9B59B6", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                >
                  导入课表
                </button>
              </div>
              {/* 周视图微缩 */}
              <div style={{ display: "flex", gap: 4 }}>
                {WEEK_DAYS.map((day, i) => {
                  const isToday = WEEK_DATES[i] === TODAY;
                  const dayEvents = schedule.filter(e => e.date === WEEK_DATES[i]);
                  return (
                    <div key={i} style={{ flex: 1, textAlign: "center", padding: "5px 2px", borderRadius: 6, background: isToday ? "#9B59B6" : "transparent" }}>
                      <div style={{ fontSize: 10, color: isToday ? "#fff" : "#999" }}>{day}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "#fff" : "#333", marginTop: 1 }}>{WEEK_LABELS[i]}</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 1, marginTop: 2, height: 4 }}>
                        {dayEvents.slice(0, 3).map((e, j) => (
                          <div key={j} style={{ width: 3, height: 3, borderRadius: "50%", background: isToday ? "#fff" : e.color }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 今日 */}
            <div style={{ padding: "14px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>📍 今日 · 4月29日 周三</div>
              <span style={{ fontSize: 11, color: "#999" }}>{todayEvents.length} 个安排</span>
            </div>

            <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {todayEvents.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#bbb", fontSize: 12 }}>今天暂无安排，去摸鱼吧 🐟</div>
              ) : todayEvents.map(ev => {
                const isPast = ev.endTime < "16:30"; // 模拟当前时间16:30
                return (
                  <div key={ev.id} style={{ display: "flex", gap: 8, padding: "8px 10px", background: ev.color, borderRadius: 8, border: ev.fromCapsule ? "1.5px dashed #4A90D9" : "1px solid rgba(0,0,0,0.05)", opacity: isPast ? 0.55 : 1, position: "relative" }}>
                    <div style={{ width: 4, borderRadius: 2, background: ev.type === "task" ? "#FA8C16" : ev.type === "exam" ? "#FF4D4F" : ev.type === "event" ? "#9B59B6" : "#4A90D9", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#333" }}>{ev.title}</div>
                      <div style={{ fontSize: 10.5, color: "#666", marginTop: 2 }}>
                        🕒 {ev.startTime}-{ev.endTime}
                        {ev.location && <span style={{ marginLeft: 8 }}>📍 {ev.location}</span>}
                      </div>
                      {ev.fromCapsule && (
                        <div style={{ fontSize: 10, color: "#4A90D9", marginTop: 2, fontWeight: 600 }}>🟡 来自胶囊 · {ev.groupName}</div>
                      )}
                    </div>
                    {isPast && <div style={{ position: "absolute", top: 4, right: 6, fontSize: 9, color: "#999" }}>已结束</div>}
                  </div>
                );
              })}
            </div>

            {/* 即将到来 */}
            <div style={{ padding: "8px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #F0F0F0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>⏭️ 即将到来</div>
              <span style={{ fontSize: 11, color: "#999" }}>未来 7 天</span>
            </div>

            <div style={{ padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {upcomingEvents.filter(e => e.date > TODAY).slice(0, 6).map(ev => (
                <div key={ev.id} style={{ display: "flex", gap: 8, padding: "8px 10px", background: ev.color, borderRadius: 8, border: ev.fromCapsule ? "1.5px dashed #4A90D9" : "1px solid rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 4, borderRadius: 2, background: ev.type === "task" ? "#FA8C16" : ev.type === "exam" ? "#FF4D4F" : ev.type === "event" ? "#9B59B6" : "#4A90D9", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#333" }}>{ev.title}</span>
                      <span style={{ fontSize: 10, color: "#999", flexShrink: 0, marginLeft: 6 }}>{ev.date.slice(5).replace("-", "/")}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: "#666", marginTop: 2 }}>
                      🕒 {ev.startTime}-{ev.endTime}
                      {ev.location && <span style={{ marginLeft: 8 }}>📍 {ev.location}</span>}
                    </div>
                    {ev.fromCapsule && (
                      <div style={{ fontSize: 10, color: "#4A90D9", marginTop: 2, fontWeight: 600 }}>🟡 {ev.groupName}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 添加日程 */}
            <div style={{ padding: "10px 16px", borderTop: "1px solid #F0F0F0", background: "#FAFBFD" }}>
              <button
                onClick={() => showToast("✨ 拖拽胶囊到此或点击+号手动添加")}
                style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1.5px dashed #BFBFBF", background: "transparent", color: "#999", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
              >
                + 手动添加日程
              </button>
            </div>
          </div>
        )}

        {/* ─── 时间胶囊面板 ─── */}
        {rightTab === "capsule" && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#666" }}>共 {capsules.length} 个 · {pendingCount} 待确认</span>
              <span style={{ fontSize: 11, color: "#4A90D9", cursor: "pointer" }}>全部 ▾</span>
            </div>

            <div style={{ flex: 1, padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {capsules.map(cap => {
                const style = CAPSULE_STYLES[cap.type] || CAPSULE_STYLES.pending;
                const isNew = newCapsuleIds.includes(cap.id);
                const isFlying = flyingCapsule === cap.id;
                return (
                  <div key={cap.id} style={{
                    background: style.bg,
                    border: `1.5px solid ${style.border}`,
                    borderRadius: 12, padding: "10px 12px",
                    transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                    transform: isFlying ? "scale(1.04) translateX(-8px)" : "scale(1)",
                    boxShadow: isNew ? `0 0 0 2px ${style.border}66, 0 4px 14px ${style.border}44` : "0 1px 4px rgba(0,0,0,0.05)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: style.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a2e", flex: 1 }}>{cap.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: style.badge, background: style.badge + "22", padding: "1px 7px", borderRadius: 8 }}>{style.label}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#3a3a5c", lineHeight: 1.55, marginBottom: 8, whiteSpace: "pre-line" }}>
                      {cap.type === "sensitive" ? "●●●● ●●●●●●●● ●●" : cap.content}
                    </div>
                    <div style={{ fontSize: 10, color: "#999", marginBottom: cap.type !== "confirmed" ? 8 : 0 }}>
                      📍 {cap.group} · {cap.from} · {cap.time}
                    </div>
                    {cap.type !== "confirmed" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => confirmCapsule(cap.id)} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", background: style.badge, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          ✓ {cap.scheduleData ? "确认入日程" : "确认"}
                        </button>
                        <button onClick={() => dismissCapsule(cap.id)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${style.border}`, background: "transparent", color: "#999", fontSize: 11, cursor: "pointer" }}>✗</button>
                      </div>
                    )}
                    {cap.type === "confirmed" && <div style={{ fontSize: 11, color: "#52C41A", fontWeight: 600 }}>✓ 已加入日程</div>}
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "10px 12px", borderTop: "1px solid #F0F0F0", background: "#FAFBFD" }}>
              <button onClick={() => setReminderModal(true)} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #4A90D9, #7B68EE)", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                💬 一键生成提醒文案
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ AI 辅助面板（私聊时弹出） ═══════════════ */}
      {aiPanel && currentChat?.type === "private" && (
        <div style={{
          position: "fixed", right: 360, bottom: 0, width: 340, height: 520,
          background: "#fff", borderTop: "1px solid #E5E5E5", borderLeft: "1px solid #E5E5E5",
          borderTopLeftRadius: 14, borderTopRightRadius: 14,
          boxShadow: "-4px -4px 20px rgba(0,0,0,0.08)",
          display: "flex", flexDirection: "column",
          zIndex: 100, animation: "slideUp 0.25s ease-out",
        }}>
          {/* 头部 */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #F0F7FF 0%, #F5F0FF 100%)", borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #4A90D9, #9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>Q</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>Q仔 · 私聊辅助</div>
                <div style={{ fontSize: 10, color: "#999" }}>基于与「{currentChat?.name}」的对话</div>
              </div>
            </div>
            <span onClick={() => setAiPanel(false)} style={{ fontSize: 18, color: "#999", cursor: "pointer", padding: "0 4px" }}>×</span>
          </div>

          {/* 快捷按钮 */}
          {aiHistory.length === 0 && (
            <div style={{ padding: "16px 14px", borderBottom: "1px solid #F0F0F0" }}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 10, fontWeight: 600 }}>快捷操作</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {AI_QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => askAI(p.label)}
                    style={{
                      padding: "10px 8px", borderRadius: 8,
                      border: "1px solid #E5E8EE", background: "#FAFBFD",
                      color: "#333", fontSize: 11.5, fontWeight: 500, cursor: "pointer",
                      textAlign: "left", display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10.5, color: "#bbb", marginTop: 10, lineHeight: 1.5 }}>
                💡 私聊AI辅助：可基于聊天内容总结要点、提取时间安排、给出回复建议，亦可直接对话提问。
              </div>
            </div>
          )}

          {/* 对话流 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {aiHistory.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start", gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 5, flexShrink: 0, background: msg.role === "user" ? "#4A90D9" : "linear-gradient(135deg, #4A90D9, #9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {msg.role === "user" ? "我" : "Q"}
                </div>
                <div style={{
                  maxWidth: "78%", padding: "8px 11px",
                  borderRadius: msg.role === "user" ? "10px 4px 10px 10px" : "4px 10px 10px 10px",
                  background: msg.role === "user" ? "#A6D8FF" : "#F5F7FA",
                  fontSize: 12.5, color: "#333", lineHeight: 1.55, whiteSpace: "pre-line",
                  border: "1px solid " + (msg.role === "user" ? "transparent" : "#E5E8EE"),
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {aiThinking && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 5, background: "linear-gradient(135deg, #4A90D9, #9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>Q</div>
                <div style={{ padding: "8px 11px", borderRadius: "4px 10px 10px 10px", background: "#F5F7FA", fontSize: 12, color: "#999" }}>
                  Q仔思考中<span className="dot-loading">...</span>
                </div>
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          {/* 输入框 */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 6 }}>
            <input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && aiInput.trim()) askAI(aiInput.trim()); }}
              placeholder="问问Q仔，比如「总结要点」"
              style={{ flex: 1, height: 30, padding: "0 10px", border: "1px solid #E5E8EE", borderRadius: 6, fontSize: 12, outline: "none", color: "#333" }}
            />
            <button
              onClick={() => aiInput.trim() && askAI(aiInput.trim())}
              style={{ padding: "0 12px", borderRadius: 6, border: "none", background: "linear-gradient(135deg, #4A90D9, #7B68EE)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >发送</button>
          </div>
        </div>
      )}

      {/* ═══════════════ 演示场景按钮 ═══════════════ */}
      <div style={{ position: "fixed", bottom: 16, left: 380, background: "rgba(255,255,255,0.97)", border: "1px solid #E5E5E5", borderRadius: 18, padding: "8px 14px", display: "flex", gap: 8, alignItems: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", backdropFilter: "blur(12px)", zIndex: 1000 }}>
        <span style={{ fontSize: 11, color: "#4A90D9", fontWeight: 700, marginRight: 4 }}>🎮 演示</span>
        {[
          { label: "📎 DDL抓取", action: simulateDDL, color: "#FA8C16" },
          { label: "🚨 冲突检测", action: simulateConflict, color: "#FF4D4F" },
          { label: "📅 群体排期", action: simulateSchedule, color: "#7B68EE" },
          { label: "📋 22:00日报", action: showDailyReport, color: "#4A90D9" },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} style={{ padding: "5px 11px", borderRadius: 10, border: `1.5px solid ${btn.color}55`, background: btn.color + "15", color: btn.color, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{btn.label}</button>
        ))}
      </div>

      {/* ═══════════════ 各类弹窗 ═══════════════ */}
      {/* 晚间日报 */}
      {dailyReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={() => setDailyReport(false)}>
          <div style={{ background: "#fff", border: "1px solid #4A90D9", borderRadius: 16, padding: "26px 28px", width: 380, boxShadow: "0 20px 60px rgba(74,144,217,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 13, color: "#4A90D9", fontWeight: 700, marginBottom: 4 }}>🌙 Q 仔 · 晚间日报</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#333", marginBottom: 16 }}>今天有 {pendingCount} 条待确认</div>
            {capsules.filter(c => c.type === "pending" || c.type === "conflict").map(cap => (
              <div key={cap.id} style={{ background: CAPSULE_STYLES[cap.type].bg, border: `1px solid ${CAPSULE_STYLES[cap.type].border}`, borderRadius: 8, padding: "9px 12px", marginBottom: 6 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a2e" }}>{cap.title}</div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>{cap.content.slice(0, 40)}…</div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#999", margin: "12px 0" }}>点击任意卡片前往确认，预计耗时 30 秒</div>
            <button onClick={() => setDailyReport(false)} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #4A90D9, #7B68EE)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>开始确认 →</button>
          </div>
        </div>
      )}

      {/* 提醒文案 */}
      {reminderModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={() => { setReminderModal(false); setSentReminder(false); }}>
          <div style={{ background: "#fff", border: "1px solid #4A90D9", borderRadius: 16, padding: "26px", width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#333", marginBottom: 4 }}>💬 生成提醒文案</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>产品赛截止还剩 6 小时 · 选择发送风格</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {REMINDER_STYLES.map((s, i) => (
                <button key={i} onClick={() => setSelectedStyle(i)} style={{ padding: "5px 10px", borderRadius: 10, border: `1.5px solid ${selectedStyle === i ? "#4A90D9" : "#E5E8EE"}`, background: selectedStyle === i ? "#E8F0FE" : "#fff", color: selectedStyle === i ? "#4A90D9" : "#666", fontSize: 11.5, cursor: "pointer", fontWeight: selectedStyle === i ? 700 : 400 }}>{s.icon} {s.label}</button>
              ))}
            </div>
            <div style={{ background: "#F8F9FB", border: "1px solid #E5E8EE", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#333", lineHeight: 1.6, marginBottom: 16, minHeight: 56 }}>{REMINDER_STYLES[selectedStyle].text}</div>
            {!sentReminder ? (
              <button onClick={() => setSentReminder(true)} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #4A90D9, #7B68EE)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>一键发送到群聊</button>
            ) : (
              <div style={{ textAlign: "center", color: "#52C41A", fontWeight: 700, fontSize: 14, padding: "8px 0" }}>✅ 已发送！将于截止前 6 小时自动发出</div>
            )}
          </div>
        </div>
      )}

      {/* 群体排期 */}
      {scheduleModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={() => setScheduleModal(false)}>
          <div style={{ background: "#fff", border: "1px solid #7B68EE", borderRadius: 16, padding: "26px", width: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#333", marginBottom: 4 }}>📅 Q 仔 · 群体排期</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>已计算所有人共同空闲时段（不展示个人具体安排）</div>
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
            <div style={{ fontSize: 10.5, color: "#bbb", marginTop: 8 }}>* 任一人确认后自动写入全部参与者日程，个人具体安排不对他人可见</div>
          </div>
        </div>
      )}

      {/* 导入课表 */}
      {importCourseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={() => setImportCourseModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px", width: 360 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#333", marginBottom: 4 }}>📥 导入课表</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>选择导入方式</div>
            {[
              { icon: "🏫", title: "教务系统直连", desc: "已绑定 · 一键同步" },
              { icon: "📷", title: "扫描课表截图", desc: "AI 识别课程名/时间/地点" },
              { icon: "📅", title: "iCal / Google Calendar", desc: "导入 .ics 文件" },
              { icon: "✏️", title: "手动添加", desc: "逐节课录入" },
            ].map((opt, i) => (
              <button
                key={i}
                onClick={() => { setImportCourseModal(false); showToast(`✅ ${opt.title}：已成功导入 13 节课`); }}
                style={{ width: "100%", padding: "12px", marginBottom: 6, border: "1px solid #E5E8EE", borderRadius: 10, background: "#fff", textAlign: "left", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              >
                <span style={{ fontSize: 22 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{opt.title}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }
        .dot-loading::after { content: '...'; animation: dotPulse 1.4s infinite; display: inline-block; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D9DCE0; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #BFBFBF; }
        input::placeholder { color: #BFBFBF; }
      `}</style>
    </div>
  );
}