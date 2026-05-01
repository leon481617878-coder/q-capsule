"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

type ChatType = "group" | "private";
type Chat = { id:number; type:ChatType; name:string; category:string; avatar:string; color:string; count?:number; lastTime:string; lastMsg:string; unread:number; pinned?:boolean; online?:boolean; };
type Message = { id:number; sender:string; content:string; time:string; self:boolean; isAI?:boolean; date?:string; isSystem?:boolean; atMe?:boolean; };
type Priority = "high"|"medium"|"low";
type ScheduleEvent = { id:number; date:string; startTime:string; endTime:string; title:string; location?:string; type:"class"|"task"|"event"|"exam"; color:string; priority?:Priority; fromCapsule?:boolean; groupName?:string; };
type CapsuleType = "pending"|"confirmed"|"conflict"|"plan"|"sensitive";
type Capsule = { id:number; type:CapsuleType; importance:Priority; group:string; title:string; content:string; time:string; from:string; new:boolean; scheduleData?:Partial<ScheduleEvent>; createdAt?:string; };
type AiMsg = { role:"user"|"ai"|"partner"; content:string; sender?:string };
type CtxMenu = { x:number; y:number; msg:Message; cid:number }|null;
type CapsuleFilter = "all"|"week"|"high"|"conflict"|"confirmed";
type EventForm = { title:string; date:string; startTime:string; endTime:string; location:string; type:ScheduleEvent["type"]; priority:Priority; };
type SharedMode = { chatId:number; partnerName:string; partnerColor:string }|null;

const CHATS: Chat[] = [
  { id:1,  type:"group",   name:"2026PCG校园AI产品创意大赛官方沟通群", category:"竞赛",    avatar:"🏆", color:"#FF6B6B", count:1010, lastTime:"15:08", lastMsg:"云上枫加入了群聊",             unread:9,  pinned:true },
  { id:2,  type:"group",   name:"王老师课题组 | 光学组",               category:"科研",    avatar:"🔬", color:"#7B68EE", count:18,   lastTime:"16:32", lastMsg:"翁一士: 明日组会线上",         unread:6,  pinned:true },
  { id:3,  type:"private", name:"张师兄",                              category:"联系人",  avatar:"张", color:"#52C41A",             lastTime:"15:42", lastMsg:"图纸我下午发你",              unread:1,  online:true },
  { id:4,  type:"group",   name:"计算机网络 · 课程群",                 category:"课程",    avatar:"📡", color:"#4A90D9", count:247,  lastTime:"14:20", lastMsg:"张老师: 周五DDL，提交学习通",  unread:3 },
  { id:5,  type:"group",   name:"数据结构与算法-2024秋",               category:"课程",    avatar:"📚", color:"#1989FA", count:189,  lastTime:"11:08", lastMsg:"[图片]",                     unread:0 },
  { id:6,  type:"group",   name:"操作系统课程群",                      category:"课程",    avatar:"💻", color:"#13C2C2", count:156,  lastTime:"昨天",  lastMsg:"助教: 实验3报告模板已上传",    unread:0 },
  { id:7,  type:"group",   name:"计科2101班级群",                      category:"班级",    avatar:"🎓", color:"#52C41A", count:32,   lastTime:"10:45", lastMsg:"班长: 班费收缴通知",           unread:2 },
  { id:8,  type:"group",   name:"计算机学院2026届毕业群",              category:"学院",    avatar:"🏫", color:"#FA8C16", count:487,  lastTime:"昨天",  lastMsg:"[公告] 毕业论文盲审说明",      unread:0 },
  { id:9,  type:"group",   name:"Team Phoenix · 创新创业大赛",         category:"竞赛",    avatar:"🔥", color:"#FF4D4F", count:5,    lastTime:"13:22", lastMsg:"我把PPT v3发群里了",           unread:4 },
  { id:10, type:"private", name:"队友 刘正昂",                         category:"联系人",  avatar:"刘", color:"#FF6B6B",             lastTime:"09:02", lastMsg:"争取今天下午",               unread:0 },
  { id:11, type:"group",   name:"光影摄影社·成员群",                   category:"社团",    avatar:"📷", color:"#9B59B6", count:89,   lastTime:"昨天",  lastMsg:"周六外拍改情人谷",             unread:0 },
  { id:12, type:"group",   name:"校学生会宣传部",                      category:"学生组织",avatar:"📢", color:"#FFB347", count:24,   lastTime:"周一",  lastMsg:"[文件] 5月活动排期.xlsx",      unread:0 },
  { id:13, type:"private", name:"小美 💕",                             category:"好友",    avatar:"美", color:"#FF85A2",             lastTime:"11:38", lastMsg:"👍 中山陵下午2点见",           unread:0,  online:true },
  { id:14, type:"private", name:"班长 李同学",                         category:"联系人",  avatar:"李", color:"#52C41A",             lastTime:"10:50", lastMsg:"班费的事麻烦下",              unread:1 },
  { id:15, type:"private", name:"妈妈 ❤️",                            category:"家人",    avatar:"妈", color:"#F5222D",             lastTime:"昨天",  lastMsg:"记得吃饭啊孩子",              unread:0 },
  { id:16, type:"group",   name:"毕业摆烂群😴",                        category:"闲聊",    avatar:"🛋️",color:"#8C8C8C", count:8,    lastTime:"昨天",  lastMsg:"今天又没去图书馆",             unread:0 },
  { id:17, type:"group",   name:"校园活动志愿者群",                    category:"活动",    avatar:"🎪", color:"#36CFC9", count:64,   lastTime:"周日",  lastMsg:"5/12志愿排班已出",             unread:0 },
  { id:18, type:"group",   name:"计算机协会·成员群",                   category:"社团",    avatar:"🖥️",color:"#20B2AA", count:45,   lastTime:"10:45", lastMsg:"@Q仔 帮忙统计团建时间",        unread:15 },
  { id:19, type:"group",   name:"校学生会·秘书处",                     category:"学生组织",avatar:"🏛️",color:"#9B59B6", count:12,   lastTime:"09:44", lastMsg:"韩同学: 期待Q仔的结果！",      unread:10 },
  { id:20, type:"private", name:"陈晓雨（策划部）",                    category:"联系人",  avatar:"陈", color:"#36CFC9",             lastTime:"16:45", lastMsg:"那这个互动环节怎么设计",        unread:3,  online:true },
  { id:21, type:"private", name:"室友 老钱",                           category:"好友",    avatar:"钱", color:"#FA8C16",             lastTime:"昨天",  lastMsg:"我觉得你理解有误",             unread:0 },
];

const MSGS: Record<number,Message[]> = {
  1:[
    {id:1,sender:"system",content:"hzh加入了群聊",time:"14:15",self:false,isSystem:true},
    {id:2,sender:"大赛官助sasa",content:"🎉【PCG校园AI产品创意大赛·选手沟通群公告】Hi～欢迎各位参赛选手！本次大赛由腾讯PCG主办，聚焦AI Native产品方案设计与落地。",time:"14:20",self:false,date:"4月22日 周二"},
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
    {id:6,sender:"Monica",content:"OK 好的 辛苦了[强]\n寄了后 跟赵博说一声",time:"10:38",self:false},
    {id:7,sender:"翁一士",content:"@Yishi @王莉莉 @仲雪飞 三位老师好，五一期间，411/416有没有实验室要开展实验活动？学院要统计",time:"14:20",self:false,date:"4月27日 周日"},
    {id:8,sender:"你",content:"xitai的片子是同一天做的吗？曝光是一个同学吗 @哩哩（刘黎黎）",time:"15:00",self:true},
    {id:9,sender:"哩哩（刘黎黎）",content:"不是同一天，有一半是一天做的，曝光是两个人，同一天仅一个人曝光",time:"15:08",self:false},
    {id:10,sender:"你",content:"横向周期设计的多少，有测过吗？\n单片光栅有色散，这边测了入出横向周期差10nm",time:"15:15",self:true},
    {id:11,sender:"哩哩（刘黎黎）",content:"412nm的横向周期\n这边测过的",time:"15:20",self:false},
    {id:12,sender:"你",content:"入和出横向周期为什么会差啊？",time:"15:22",self:true},
    {id:13,sender:"哩哩（刘黎黎）",content:"我也没想明白，有好有坏。另外下面的载具可以旋转0.5度，具体逆时针还是顺时针需要封一下看看。",time:"15:35",self:false},
    {id:14,sender:"翁一士",content:"明日组会线上[旺柴][强]",time:"16:20",self:false,date:"今天"},
    {id:15,sender:"王闯",content:"[旺柴][强]",time:"16:21",self:false},
    {id:16,sender:"MMMN",content:"光阑是松的 动了光阑后 光斑位置变了\n。。。。。",time:"16:25",self:false},
    {id:17,sender:"翁一士",content:"翁一士 邀请您参加腾讯会议\n📞 429组会\n🕐 2026/04/29 16:30-19:30\n截止前提交实验进度汇报",time:"16:32",self:false,atMe:true},
  ],
  3:[
    {id:1,sender:"张师兄",content:"师弟最近实验咋样，出数据了吗",time:"09:00",self:false,date:"4月24日 周四"},
    {id:2,sender:"你",content:"还在跑数据，衍射效率这边有点低，不知道是不是曝光量的问题",time:"09:05",self:true},
    {id:3,sender:"张师兄",content:"曝光量调多少了",time:"09:07",self:false},
    {id:4,sender:"你",content:"150mJ/cm² 按之前的参数来的",time:"09:08",self:true},
    {id:5,sender:"张师兄",content:"试试提到180，我上次这个参数效果更好",time:"09:10",self:false},
    {id:6,sender:"你",content:"好的，今天下午试试，谢谢师兄！",time:"09:11",self:true},
    {id:7,sender:"张师兄",content:"另外翁老师说要讲彩色的进展，你那边彩色片子啥时候能出来",time:"14:30",self:false},
    {id:8,sender:"你",content:"下周三之前应该能做完，就是不知道效果好不好",time:"14:32",self:true},
    {id:9,sender:"张师兄",content:"先做出来再说，不好再迭代嘛",time:"14:34",self:false},
    {id:10,sender:"你",content:"嗯嗯，那组会要不要展示中间过程的数据",time:"14:35",self:true},
    {id:11,sender:"张师兄",content:"展示一下吧，翁老师喜欢看过程，不是只看结果",time:"14:36",self:false},
    {id:12,sender:"你",content:"ok收到！",time:"14:37",self:true},
    {id:13,sender:"张师兄",content:"对了你用的是哪个型号的全息材料",time:"16:00",self:false,date:"今天"},
    {id:14,sender:"你",content:"Bayfol HX 200，不是特别好但实验室就这个",time:"16:02",self:true},
    {id:15,sender:"张师兄",content:"在吗师弟，最近实验进展怎么样",time:"09:15",self:false},
    {id:16,sender:"你",content:"在的师兄！上周做的两组样品已经测完，横向周期偏差有点大",time:"09:20",self:true},
    {id:17,sender:"张师兄",content:"偏差多少",time:"09:21",self:false},
    {id:18,sender:"你",content:"10nm左右，比预期大",time:"09:22",self:true},
    {id:19,sender:"张师兄",content:"嗯，可能是曝光那边的问题，下次可以试试调一下载具角度",time:"09:30",self:false},
    {id:20,sender:"张师兄",content:"对了下午的图纸我整理一下，3点前发你",time:"14:10",self:false},
    {id:21,sender:"你",content:"好嘞！师兄辛苦",time:"14:11",self:true},
    {id:22,sender:"张师兄",content:"图纸我下午发你",time:"15:42",self:false},
  ],
  4:[
    {id:1,sender:"张老师",content:"同学们晚上好，本周的课程内容是TCP/UDP协议详解，预习材料已上传至学习通",time:"20:15",self:false,date:"4月22日 周二"},
    {id:2,sender:"助教 陈学长",content:"📌 第三章作业已发布：\n1. 完成课后习题3.1-3.8\n2. 编程题：实现简易TCP三次握手模拟\n3. 截止时间：5月9日 23:59\n4. 双平台提交：邮箱+学习通",time:"10:00",self:false,date:"4月25日 周五"},
    {id:3,sender:"你",content:"@助教 陈学长 请问编程题用Python还是C都可以吗",time:"10:30",self:true},
    {id:4,sender:"助教 陈学长",content:"@你 都可以，附上简要的注释和运行截图就行",time:"10:32",self:false},
    {id:5,sender:"李同学",content:"请问DDL会延期吗，五一假期写不完啊😭",time:"11:00",self:false},
    {id:6,sender:"助教 陈学长",content:"DDL不延期哦，五一前可以提前写",time:"11:05",self:false},
    {id:7,sender:"赵同学",content:"请问编程题要不要测试用例截图",time:"11:20",self:false},
    {id:8,sender:"助教 陈学长",content:"需要！要展示三次握手的完整过程输出",time:"11:22",self:false},
    {id:9,sender:"张老师",content:"📢 重要通知：本周四（4月30日）下午的课调到 教三-204，时间不变下午14:00开始",time:"14:00",self:false,date:"4月28日 周一"},
    {id:10,sender:"你",content:"收到",time:"14:05",self:true},
    {id:11,sender:"张老师",content:"再次提醒：第三章课后作业本周五（5月9日）23:59前提交，word格式，不少于3000字，发到课程邮箱，并同步提交到学习通平台",time:"14:20",self:false,date:"今天"},
    {id:12,sender:"助教 陈学长",content:"补充：不接受补交，请大家务必提前完成",time:"14:22",self:false},
    {id:13,sender:"钱同学",content:"老师，学习通是提交word还是pdf",time:"14:25",self:false},
    {id:14,sender:"张老师",content:"@钱同学 word即可，不用再转pdf",time:"14:26",self:false},
    {id:15,sender:"周同学",content:"感谢老师！",time:"14:27",self:false},
  ],
  9:[
    {id:1,sender:"队友 王",content:"大家好，先确认一下分工，我负责市场调研和商业模式",time:"10:00",self:false,date:"4月24日 周四"},
    {id:2,sender:"队友 周",content:"我做技术方案和架构图",time:"10:05",self:false},
    {id:3,sender:"你",content:"我来做产品设计和PPT视觉",time:"10:07",self:true},
    {id:4,sender:"队友 刘",content:"我写用户调研和竞品分析",time:"10:09",self:false},
    {id:5,sender:"队友 王",content:"好！那周四晚8点，腾讯会议，对齐进度",time:"10:13",self:false},
    {id:6,sender:"队友 刘",content:"我发现一个竞品做得不错，等会截图发群里",time:"11:30",self:false},
    {id:7,sender:"你",content:"他家这个排版不错，可以参考风格",time:"11:35",self:true},
    {id:8,sender:"队友 王",content:"对对对，但我们差异化要体现出来，不要做得一样",time:"11:37",self:false},
    {id:9,sender:"你",content:"我把PPT v3发群里了，大家看看",time:"11:20",self:true,date:"今天"},
    {id:10,sender:"你",content:"[文件] Team Phoenix_产品方案_v3.pptx",time:"11:21",self:true},
    {id:11,sender:"队友 王",content:"我看了，第8页商业模式那块有点单薄",time:"11:35",self:false},
    {id:12,sender:"队友 刘",content:"+1 还有用户画像可以再具体点",time:"11:40",self:false},
    {id:13,sender:"你",content:"好，我再补充一下，今晚改完发新版",time:"11:45",self:true},
    {id:14,sender:"队友 周",content:"⏰ 初赛截止5月6日23:59，下周一前要把所有材料定稿！",time:"13:00",self:false},
    {id:15,sender:"队友 周",content:"@全体成员 还剩 5 天，加油冲！",time:"13:01",self:false,atMe:true},
    {id:16,sender:"你",content:"收到，加油！",time:"13:22",self:true},
    {id:17,sender:"队友 王",content:"加油！我今晚把商业模式那页补充好发给你",time:"13:25",self:false},
    {id:18,sender:"队友 刘",content:"用户调研数据我再多找几个样本，周五发给你",time:"13:28",self:false},
  ],
  13:[
    {id:1,sender:"小美",content:"在吗在吗！下周末有空不",time:"10:00",self:false,date:"4月26日 周六"},
    {id:2,sender:"你",content:"在！干啥",time:"10:05",self:true},
    {id:3,sender:"小美",content:"想组个出游，好久没出来玩了，你有空吗",time:"10:08",self:false},
    {id:4,sender:"你",content:"好啊好啊，去哪？",time:"10:10",self:true},
    {id:5,sender:"小美",content:"中山陵吧？你没去过吧",time:"10:12",self:false},
    {id:6,sender:"你",content:"没去过，听说挺出片的，行！",time:"10:15",self:true},
    {id:7,sender:"小美",content:"哈哈就知道你会答应！我查了下，地铁2号线中山陵站，走路约15分钟",time:"10:20",self:false},
    {id:8,sender:"你",content:"那下午出发？几点合适",time:"10:22",self:true},
    {id:9,sender:"小美",content:"建议1点出发，2点到景区，这样时间充裕还能赶上好光线",time:"10:25",self:false},
    {id:10,sender:"你",content:"好，1点我去找你，一起坐地铁过去",time:"10:27",self:true},
    {id:11,sender:"小美",content:"嗯嗯！记得提前在公众号实名预约哦，免费但需要预约",time:"10:30",self:false},
    {id:12,sender:"你",content:"好的，我现在就预约，你的身份证号发我一下",time:"10:32",self:true},
    {id:13,sender:"小美",content:"等下，我自己预约！你预约你自己的就行哈哈哈",time:"10:33",self:false},
    {id:14,sender:"你",content:"哈哈哈好，那我先预约好",time:"10:34",self:true},
    {id:15,sender:"小美",content:"周末出游定了吗？确认一下，就我们俩，周六下午",time:"11:30",self:false,date:"今天"},
    {id:16,sender:"你",content:"确认！下午2点地铁中山陵站A口集合",time:"11:35",self:true},
    {id:17,sender:"小美",content:"👍 中山陵下午2点见！穿舒服的鞋啊，台阶很多",time:"11:38",self:false},
    {id:18,sender:"你",content:"收到，期待！",time:"11:40",self:true},
  ],
  14:[
    {id:1,sender:"班长 李同学",content:"兄弟，毕业旅行你报名了吗",time:"09:00",self:false,date:"4月24日 周四"},
    {id:2,sender:"你",content:"报了！在群里接龙了",time:"09:05",self:true},
    {id:3,sender:"班长 李同学",content:"ok好，可能去厦门，大概6月底，你有没有时间",time:"09:07",self:false},
    {id:4,sender:"你",content:"答辩完了应该就可以，大概6月底",time:"09:09",self:true},
    {id:5,sender:"班长 李同学",content:"兄弟，班费150记得交一下",time:"10:50",self:false,date:"今天"},
    {id:6,sender:"班长 李同学",content:"另外团建你去吗？要的话给你登记一下",time:"10:51",self:false},
    {id:7,sender:"你",content:"班费今天转！团建我去",time:"10:55",self:true},
    {id:8,sender:"班长 李同学",content:"收到，帮你登记了",time:"10:56",self:false},
    {id:9,sender:"你",content:"谢谢！紫金山是全天活动还是半天",time:"10:57",self:true},
    {id:10,sender:"班长 李同学",content:"全天，上午爬山下午休息，晚上集体吃饭，穿舒服的鞋",time:"10:58",self:false},
    {id:11,sender:"你",content:"明白！",time:"10:59",self:true},
    {id:12,sender:"班长 李同学",content:"另外下周一早上有个辅导员要求的班会，9点，记得来",time:"11:00",self:false},
    {id:13,sender:"你",content:"好的，我记下来了",time:"11:01",self:true},
  ],
  15:[
    {id:1,sender:"妈妈",content:"孩子在忙什么呢",time:"10:00",self:false,date:"4月22日 周二"},
    {id:2,sender:"你",content:"在写作业，最近有点多",time:"10:05",self:true},
    {id:3,sender:"妈妈",content:"注意休息，别熬太晚",time:"10:07",self:false},
    {id:4,sender:"你",content:"知道了妈，你们在家都好吧",time:"10:08",self:true},
    {id:5,sender:"妈妈",content:"好好的，你爸去钓鱼了，钓了好多，让我冻起来等你回来吃",time:"10:09",self:false},
    {id:6,sender:"你",content:"哈哈好，那我放假回去",time:"10:10",self:true},
    {id:7,sender:"妈妈",content:"孩子，妈给你寄了点家里的腊肉，明后天到",time:"18:30",self:false,date:"昨天"},
    {id:8,sender:"你",content:"好嘞！谢谢妈",time:"18:35",self:true},
    {id:9,sender:"妈妈",content:"记得吃饭啊孩子，别老吃外卖",time:"21:00",self:false},
    {id:10,sender:"你",content:"妈我吃的，你放心",time:"21:05",self:true},
    {id:11,sender:"妈妈",content:"今天吃什么了",time:"21:06",self:false},
    {id:12,sender:"你",content:"下午食堂吃的黄焖鸡，挺好的",time:"21:08",self:true},
    {id:13,sender:"妈妈",content:"那不错，多吃蔬菜",time:"21:09",self:false},
    {id:14,sender:"你",content:"嗯嗯！妈你早点睡",time:"21:10",self:true},
    {id:15,sender:"妈妈",content:"好，你也早点睡，明天还有课",time:"21:11",self:false},
    {id:16,sender:"你",content:"好的妈，晚安！",time:"21:12",self:true},
  ],
  // ── 群体排期：计算机协会团建 ──────────────────────────────
  18:[
    {id:1,sender:"社长小李",content:"🎉 各位会员大家好！五月份协会打算组织一次线下团建，想提前统计大家方便的时间，请回复你的空闲时段～",time:"10:00",self:false,date:"今天"},
    {id:2,sender:"副社长小张",content:"我周末全天都有空，平时工作日晚上也可以",time:"10:03",self:false},
    {id:3,sender:"技术部 王磊",content:"我周一中午可以，其他时间基本有课",time:"10:05",self:false},
    {id:4,sender:"宣传部 小美",content:"工作日晚上可以！周末上午有家教",time:"10:07",self:false},
    {id:5,sender:"你",content:"我周六下午和周日全天都有空",time:"10:09",self:true},
    {id:6,sender:"运营部 小赵",content:"我周二早上可以，或者周末下午",time:"10:12",self:false},
    {id:7,sender:"技术部 林同学",content:"工作日晚上方便，周末要回家",time:"10:15",self:false},
    {id:8,sender:"策划部 小陈",content:"我都有时间！全程参与！",time:"10:16",self:false},
    {id:9,sender:"外联部 小周",content:"周六下午可以，周日有其他安排",time:"10:18",self:false},
    {id:10,sender:"财务部 小刘",content:"周三晚上和周末下午ok",time:"10:20",self:false},
    {id:11,sender:"技术部 老高",content:"我周末两天都可以，工作日有实验不确定",time:"10:22",self:false},
    {id:12,sender:"宣传部 小孙",content:"五一之后的周六全天都有空",time:"10:25",self:false},
    {id:13,sender:"社长小李",content:"大家都很积极！再等几个人回复哈",time:"10:27",self:false},
    {id:14,sender:"运营部 小何",content:"周四晚上或周末下午都行",time:"10:30",self:false},
    {id:15,sender:"外联部 小郑",content:"工作日晚上都行，周末上午有健身",time:"10:32",self:false},
    {id:16,sender:"技术部 小冯",content:"我5月10号之前有项目要交，10号以后随时都行",time:"10:35",self:false},
    {id:17,sender:"策划部 小许",content:"周六全天都有空！强烈支持周六！",time:"10:38",self:false},
    {id:18,sender:"宣传部 小曹",content:"工作日我晚上8点后才有空，周末随意",time:"10:40",self:false},
    {id:19,sender:"社长小李",content:"@Q仔 大家时间都回复得差不多了，帮忙统计一下什么时间段参与人数最多，给出最佳团建时间推荐！",time:"10:42",self:false,atMe:true},
    {id:20,sender:"你",content:"等Q仔出结果👀",time:"10:45",self:true},
  ],
  // ── 群体排期：学生会秘书处例会 ──────────────────────────
  19:[
    {id:1,sender:"秘书长 宋同学",content:"大家好，本周例会时间还没定，先统计一下大家什么时候方便，争取今天把时间定下来",time:"09:00",self:false,date:"今天"},
    {id:2,sender:"秘书处 王同学",content:"我周一中午有空，下午基本有课",time:"09:05",self:false},
    {id:3,sender:"组织部 李同学",content:"工作日晚上可以，最好7点以后",time:"09:08",self:false},
    {id:4,sender:"你",content:"我周二早上和周四晚上都行",time:"09:10",self:true},
    {id:5,sender:"宣传部 张同学",content:"我周三下午没课，可以那个时候开",time:"09:12",self:false},
    {id:6,sender:"学习部 陈同学",content:"工作日晚上8点前最好，之后有选修课",time:"09:15",self:false},
    {id:7,sender:"文体部 赵同学",content:"我周一下午有活动，其他时间都随意",time:"09:17",self:false},
    {id:8,sender:"外联部 孙同学",content:"我全周都行，配合大家时间就好",time:"09:19",self:false},
    {id:9,sender:"秘书处 周同学",content:"周二早上和周四晚上我都可以！",time:"09:21",self:false},
    {id:10,sender:"秘书长 宋同学",content:"好的，继续收集，今天把时间定下来",time:"09:23",self:false},
    {id:11,sender:"组织部 吴同学",content:"周三下午或者周五晚上都行",time:"09:25",self:false},
    {id:12,sender:"学习部 郑同学",content:"我只有周二早上和周日下午有空，其他时间全排满了",time:"09:28",self:false},
    {id:13,sender:"文体部 冯同学",content:"工作日晚上七八点都可以",time:"09:30",self:false},
    {id:14,sender:"宣传部 褚同学",content:"周三下午没课，+1",time:"09:32",self:false},
    {id:15,sender:"外联部 卫同学",content:"周二早上和周四晚上都可以！",time:"09:34",self:false},
    {id:16,sender:"财务部 蒋同学",content:"我比较灵活，大家定哪天我都行",time:"09:36",self:false},
    {id:17,sender:"秘书处 沈同学",content:"我周一至周四晚上都可以，周末不太方便",time:"09:38",self:false},
    {id:18,sender:"你",content:"感觉周二早上和周四晚上呼声比较高？",time:"09:40",self:true},
    {id:19,sender:"秘书长 宋同学",content:"@Q仔 帮统计一下，什么时间段参与度最高，给出最佳例会时间推荐，顺便考虑郑同学只有周二早上可以这个特殊情况",time:"09:42",self:false,atMe:true},
    {id:20,sender:"组织部 韩同学",content:"期待Q仔的结果！",time:"09:44",self:false},
  ],
  // ── 私聊：活动方案设计 ────────────────────────────────────
  20:[
    {id:1,sender:"陈晓雨",content:"你好，关于下个月的五四主题晚会方案，想和你对一下思路",time:"14:00",self:false,date:"4月28日 周一"},
    {id:2,sender:"你",content:"好的，你说说看你的想法",time:"14:02",self:true},
    {id:3,sender:"陈晓雨",content:"我设想了三个主板块：①文艺演出 ②互动游戏 ③颁奖典礼。走爱国主义+青春活力风格，你觉得怎么样？",time:"14:05",self:false},
    {id:4,sender:"你",content:"框架不错！互动游戏这块感觉太宽泛了，得具体化，不然策划书写不下去",time:"14:08",self:true},
    {id:5,sender:"陈晓雨",content:"你说得对，互动游戏可以怎么具体化？",time:"14:10",self:false},
    {id:6,sender:"你",content:"可以结合五四主题，做一个「青春知识闯关」——历史知识竞答+抢答，现场感强而且有主题",time:"14:13",self:true},
    {id:7,sender:"陈晓雨",content:"这个好！有参与感。那颁奖典礼这块，你觉得奖项设置怎么样会更有意思？",time:"14:16",self:false},
    {id:8,sender:"你",content:"传统「最佳表演奖」太无聊了，可以整：「最强卷王奖」「最佳摸鱼奖」「深夜007奖」，大家更有参与感",time:"14:20",self:true},
    {id:9,sender:"陈晓雨",content:"哈哈哈哈好！那文艺演出这块，朗诵2个、舞蹈1个、合唱1个，节目数量够吗",time:"14:22",self:false},
    {id:10,sender:"你",content:"够了，控制在1.5小时内比较好，观众专注度有限",time:"14:24",self:true},
    {id:11,sender:"陈晓雨",content:"对对对。另外经费，整场活动预算3000，你觉得怎么分配比较合理？",time:"14:26",self:false},
    {id:12,sender:"你",content:"演出道具800，场地布置800，奖品700，主持人服装200，其他备用500",time:"14:29",self:true},
    {id:13,sender:"陈晓雨",content:"OK！我画了个流程草稿，你看一下互动环节的设计思路 [图片]",time:"14:35",self:false},
    {id:14,sender:"你",content:"看到了，闯关环节可以再加一个「团队协作」题型，增加集体感",time:"14:38",self:true},
    {id:15,sender:"陈晓雨",content:"好主意！这样三种题型：个人抢答、队伍竞赛、团队协作，层次更丰富",time:"14:40",self:false},
    {id:16,sender:"你",content:"我已经把刚才聊的主要内容让Q仔做了总结，我直接共享给你，你看看有没有遗漏",time:"14:42",self:true},
    {id:17,sender:"陈晓雨",content:"收到了！这个总结超全 🎉 经费那块我觉得演出道具可以再压一点，奖品那边充实一下，观众参与感更强",time:"14:45",self:false},
    {id:18,sender:"你",content:"有道理，我在Q仔那边更新一下，你也可以直接在共享界面里问它",time:"14:47",self:true},
    {id:19,sender:"陈晓雨",content:"嗯嗯！我直接在那边问Q仔互动游戏的具体规则设计，然后我们再对齐",time:"14:49",self:false},
    {id:20,sender:"陈晓雨",content:"那这个互动环节怎么设计",time:"16:45",self:false},
  ],
  // ── 私聊：思想矛盾争执 ────────────────────────────────────
  21:[
    {id:1,sender:"室友 老钱",content:"我觉得你最近把宿舍公共区域搞得太乱了",time:"21:00",self:false,date:"昨天"},
    {id:2,sender:"你",content:"我有乱吗？我一直都有整理自己那块的",time:"21:02",self:true},
    {id:3,sender:"室友 老钱",content:"你的书堆了大半张桌子，我都没地方放东西了",time:"21:04",self:false},
    {id:4,sender:"你",content:"那堆书不全是我的，中间那本是老二放的，你说话之前搞清楚",time:"21:06",self:true},
    {id:5,sender:"室友 老钱",content:"就算有一本是老二的，你剩下那几本不也占着地方吗？别什么都往别人身上推",time:"21:08",self:false},
    {id:6,sender:"你",content:"我什么时候推卸责任了？你这说话方式我很不舒服",time:"21:10",self:true},
    {id:7,sender:"室友 老钱",content:"上周那个快递盒放了三天你都没扔，这也是我的问题吗",time:"21:12",self:false},
    {id:8,sender:"你",content:"那周我期末复习，确实忘了，但这是小事，值得这么说吗",time:"21:14",self:true},
    {id:9,sender:"室友 老钱",content:"小事积累起来就是大事。集体生活要考虑别人，不能只想着自己方便",time:"21:16",self:false},
    {id:10,sender:"你",content:"我确实不够细心，这点我承认，但你说话方式让我觉得是在被指责，很难听进去",time:"21:18",self:true},
    {id:11,sender:"室友 老钱",content:"我说话有什么问题？我就是在说实话，你太敏感了",time:"21:20",self:false},
    {id:12,sender:"你",content:"你说我「太敏感」，这就是问题——这是在否定我的感受，而不是在解决问题",time:"21:22",self:true},
    {id:13,sender:"室友 老钱",content:"行行行，我说话方式有问题，你满意了？你的事情就没问题？",time:"21:25",self:false},
    {id:14,sender:"你",content:"我没有说我没问题，但你现在的态度根本没办法好好谈",time:"21:27",self:true},
    {id:15,sender:"室友 老钱",content:"……好，那我们先冷静一下吧，但公共区域的事情要解决",time:"21:30",self:false},
    {id:16,sender:"你",content:"同意。我让Q仔帮我分析了一下这次对话，对双方的问题都分析得挺客观的，我共享给你，我们一起看看怎么处理",time:"21:35",self:true},
    {id:17,sender:"室友 老钱",content:"……好，发来看看",time:"21:37",self:false},
    {id:18,sender:"室友 老钱",content:"我看了。Q仔说的「沟通时多用我感觉而非你总是」这点，我确实做得不太好",time:"21:45",self:false},
    {id:19,sender:"你",content:"我也有问题，桌子确实应该整理的，快递盒也应该及时扔",time:"21:47",self:true},
    {id:20,sender:"室友 老钱",content:"我觉得你理解有误，不是Q仔分析得有问题，是我觉得它说的「两人均有道理」太圆滑了",time:"21:50",self:false},
  ],
};

// ── 群体排期数据 ───────────────────────────────────────────
const GROUP_SCHED: Record<number,{gName:string;total:number;slots:{label:string;count:number;pct:number;who:string}[];best:{label:string;pct:number;date:string;sT:string;eT:string;title:string;color:string};note:string}> = {
  18:{gName:"计算机协会·团建",total:18,slots:[
    {label:"周六下午 14:00-17:00",count:16,pct:88,who:"张/小美/小赵/老高/小许等16人"},
    {label:"工作日晚上 19:00-21:00",count:14,pct:78,who:"宣传/财务/外联等14人"},
    {label:"周日全天",count:12,pct:67,who:"12人可参与"},
    {label:"周六上午",count:8,pct:44,who:"8人，部分有家教"},
  ],best:{label:"周六下午 14:00-17:00",pct:88,date:"2026-05-16",sT:"14:00",eT:"17:00",title:"💻 计算机协会团建",color:"#E0F7FA"},note:"建议5月10日之后的周六（等小冯结束项目），88%参与率最高"},
  19:{gName:"学生会·秘书处例会",total:17,slots:[
    {label:"周二早上 8:30-9:30",count:14,pct:82,who:"你/周同学/卫同学/郑同学等14人"},
    {label:"周四晚上 19:00-20:30",count:13,pct:76,who:"13人可参与"},
    {label:"周三下午 14:00-16:00",count:12,pct:71,who:"张/褚同学等12人"},
    {label:"工作日晚上（周一至四）",count:11,pct:65,who:"11人可参与"},
  ],best:{label:"周二早上 8:30-9:30",pct:82,date:"2026-05-06",sT:"08:30",eT:"09:30",title:"🏛️ 学生会秘书处例会",color:"#F3E5F5"},note:"郑同学只有周二早上可以；照顾边缘同学，建议周二早上作为固定例会"},
};

// ── 日程 ──────────────────────────────────────────────────
const TODAY = "2026-04-29";
const INIT_SCH: ScheduleEvent[] = [
  {id:1, date:"2026-04-29",startTime:"10:10",endTime:"11:00",title:"国家安全学",       location:"逸C-114",  type:"class",color:"#E3F2FD",priority:"medium"},
  {id:2, date:"2026-04-29",startTime:"18:30",endTime:"20:20",title:"中国近现代史纲要", location:"逸B-302",  type:"class",color:"#E1F5FE",priority:"medium"},
  {id:3, date:"2026-04-30",startTime:"14:00",endTime:"16:00",title:"计网课（教三-204）",location:"教三-204",type:"class",color:"#E3F2FD",priority:"medium"},
  {id:4, date:"2026-05-02",startTime:"10:00",endTime:"12:00",title:"数据结构实验课",   location:"机房302",  type:"class",color:"#E8F5E9",priority:"medium"},
  {id:5, date:"2026-05-06",startTime:"23:00",endTime:"23:59",title:"🔥 创新赛初赛截止",                     type:"task", color:"#FFF1F0",priority:"high"},
  {id:6, date:"2026-05-07",startTime:"14:00",endTime:"17:00",title:"操作系统实验3答辩", location:"机房405",  type:"exam", color:"#FFF0F6",priority:"high"},
  {id:7, date:"2026-05-09",startTime:"23:00",endTime:"23:59",title:"📎 计网作业截止",                       type:"task", color:"#FFE7BA",priority:"high"},
  {id:8, date:"2026-05-10",startTime:"23:59",endTime:"23:59",title:"PCG报名截止",                           type:"task", color:"#FFF1F0",priority:"medium"},
  {id:9, date:"2026-05-12",startTime:"08:00",endTime:"12:00",title:"志愿服务·图书馆",   location:"图书馆",   type:"event",color:"#F0FFF4",priority:"low"},
  {id:10,date:"2026-05-15",startTime:"23:59",endTime:"23:59",title:"数据结构实验DDL",                       type:"task", color:"#FFE7BA",priority:"high"},
];

// ── 样式系统 ──────────────────────────────────────────────
const IMP:Record<Priority,{bg:string;border:string;badge:string;dot:string;label:string}> = {
  high:   {bg:"#FFF1F0",border:"#FF7875",badge:"#FF4D4F",dot:"#FF4D4F",label:"紧急"},
  medium: {bg:"#FFF7E6",border:"#FFB340",badge:"#FA8C16",dot:"#FA8C16",label:"重要"},
  low:    {bg:"#FFFBE6",border:"#FFD666",badge:"#FAAD14",dot:"#FAAD14",label:"一般"},
};
const TYPE_ST:Record<string,{bg:string;border:string;badge:string;dot:string;label:string}> = {
  confirmed:{bg:"#F6FFED",border:"#95DE64",badge:"#52C41A",dot:"#52C41A",label:"已确认"},
  plan:     {bg:"#EFF6FF",border:"#93C5FD",badge:"#3B82F6",dot:"#3B82F6",label:"方案参考"},
  sensitive:{bg:"#F5F5F5",border:"#D9D9D9",badge:"#8C8C8C",dot:"#8C8C8C",label:"敏感信息"},
};
const getCS=(c:Capsule)=>{
  if(c.type==="confirmed")return TYPE_ST.confirmed;
  if(c.type==="plan")     return TYPE_ST.plan;
  if(c.type==="sensitive")return TYPE_ST.sensitive;
  if(c.type==="conflict") return IMP.high;
  return IMP[c.importance]||IMP.medium;
};
const prColor=(p?:Priority)=>p==="high"?"#FF4D4F":p==="medium"?"#FA8C16":"#52C41A";

// ── 初始胶囊 ──────────────────────────────────────────────
const INIT_CAPS:Capsule[]=[
  {id:101,type:"pending", importance:"medium",group:"计算机网络 · 课程群",title:"📎 第三章作业 DDL",  content:"5月9日 23:59 前提交\nWord格式，不少于3000字\n邮箱+学习通双平台",            time:"14:20",from:"张老师",  new:true, createdAt:TODAY,scheduleData:{date:"2026-05-09",startTime:"23:00",endTime:"23:59",title:"📎 计网作业截止",type:"task",color:"#FFE7BA",priority:"high"}},
  {id:102,type:"pending", importance:"medium",group:"计网课程群",          title:"📍 周四课地点变更", content:"4月30日 14:00 → 教三-204\n时间不变",                                       time:"14:00",from:"张老师",  new:true, createdAt:TODAY,scheduleData:{date:"2026-04-30",startTime:"14:00",endTime:"16:00",title:"🔄 计网课（教三-204）",type:"class",color:"#E6F7FF",priority:"medium"}},
  {id:103,type:"conflict",importance:"high",  group:"摄影社 × 课题组",   title:"⚠️ 周日下午时间冲突",content:"周日14:30 摄影外拍（情人谷集合）\n周日15:00 课题组小会议\n两者不可兼得",  time:"16:32",from:"AI 检测", new:true, createdAt:TODAY},
  {id:104,type:"plan",    importance:"low",   group:"小美 💕",             title:"🗺️ 周末出游已确定", content:"✅ 周六 14:00 中山陵地铁站集合\n👥 小美、小红、你",                        time:"11:38",from:"AI 总结", new:false,createdAt:TODAY,scheduleData:{date:"2026-05-02",startTime:"14:00",endTime:"18:00",title:"🌸 中山陵出游",type:"event",color:"#FCE4EC",priority:"low"}},
  {id:105,type:"pending", importance:"high",  group:"Team Phoenix",       title:"🔥 初赛截止 5/6",   content:"PPT + Demo视频 + 申报书\n建议5/5前定稿留出buffer\n⏰ 还剩5天！",          time:"13:01",from:"队友 周", new:true, createdAt:TODAY,scheduleData:{date:"2026-05-06",startTime:"23:00",endTime:"23:59",title:"🔥 创新赛初赛截止",type:"task",color:"#FFF1F0",priority:"high"}},
  {id:106,type:"pending", importance:"high",  group:"王老师课题组",        title:"🔬 今日组会 16:30", content:"4月29日 16:30-19:30\n腾讯会议线上",                                       time:"16:32",from:"翁一士",  new:true, createdAt:TODAY,scheduleData:{date:"2026-04-29",startTime:"16:30",endTime:"19:30",title:"🔬 课题组组会(线上)",type:"event",color:"#F9F0FF",priority:"high"}},
];

// ── AI 摘要 ───────────────────────────────────────────────
const AI_SUM:Record<number,string>={
  1: "📋 **对话总结（PCG大赛群）**\n\n• 大赛提交：PPT（≤20页）+ Demo视频（≤5分钟）\n• API：可用第三方，但使用混元有加分\n• 报名截止：5月10日，初赛提交：5月20日\n\n📌 **待办**\n1. 报名截止 5月10日\n2. Demo视频准备",
  2: "📋 **对话总结（课题组）**\n\n• 今日重点：16:30 腾讯会议组会\n• 实验进展：横向周期偏差10nm，载具旋转调整中\n\n📌 **待办**\n1. ⚡ 今天16:30参加腾讯会议\n2. 整理彩色样品进展，准备汇报",
  4: "📋 **对话总结（计网群）**\n\n• ⚡ 第三章作业DDL：5月9日23:59\n• 作业：Word格式，3000字，学习通+邮箱双提交\n• 地点变更：4月30日课改到教三-204，14:00不变\n\n📌 **紧急待办**\n1. ⚡ 计网作业（还有10天）\n2. 周四注意换教室：教三-204",
  9: "📋 **对话总结（Team Phoenix）**\n\n• 截止：5月6日23:59，还剩5天\n• v3有问题：商业模式单薄、用户画像不具体\n\n📌 **紧急待办**\n1. 今晚出PPT v4\n2. 等队友素材（周五截止）",
  13:"📋 **对话总结（小美）**\n\n• ✅ 周六（5月2日）14:00 中山陵集合\n• 参与：你、小美、小红 三人均已确认\n• 地铁2号线中山陵站下，走路15分钟\n\n📌 **行动建议**\n1. 提前在「钟山风景名胜区」公众号实名预约\n2. 穿平底鞋，带充电宝",
  18:"📋 **群体排期分析（计算机协会团建）**\n\n基于 18 位成员的时间回复，Q仔分析如下：\n\n🏆 **最佳时间：**\n① **周六下午 14:00-17:00** — 88%参与（16/18人）✅ 推荐\n② 工作日晚上 19:00-21:00 — 78%参与\n③ 周日全天 — 67%参与\n\n⚠️ 小冯同学5月10号前有项目，建议10号后的周六",
  19:"📋 **群体排期分析（学生会秘书处例会）**\n\n基于 17 位成员的时间偏好，Q仔分析如下：\n\n🏆 **最佳例会时间：**\n① **周二早上 8:30-9:30** — 82%参与（14/17人）✅ 推荐\n② 周四晚上 19:00-20:30 — 76%参与\n③ 周三下午 14:00 — 71%参与\n\n⚠️ 郑同学只有周二早上有空，周二早上可最大包容",
  20:"📋 **五四晚会策划要点总结**\n\n**✅ 已确认：**\n• 三大板块：文艺演出 + 互动游戏 + 颁奖典礼\n• 演出：朗诵×2、舞蹈×1、合唱×1（控制1.5h）\n• 互动：「青春知识闯关」3种题型\n• 趣味奖项：最强卷王奖、最佳摸鱼奖、深夜007奖\n\n**💰 经费（总3000元）：**\n• 演出道具：800 / 场地布置：800 / 奖品：700\n• 主持服装：200 / 备用：500\n\n**⏳ 待讨论：** 互动游戏规则细化 / 主持人人选\n\n💡 可以共享给策划伙伴一起完善！",
  21:"📋 **对话分析（宿舍矛盾）**\n\n**争议核心：**\n• 老钱：公共区域整洁诉求（书堆、快递盒）\n• 你：部分责任归属不清，沟通方式令人不适\n\n**客观分析：**\n两人均有一定道理。整洁是集体生活的合理诉求；但「你太敏感」等否定性词语会关闭对话而非解决问题。\n\n💡 **冲突化解建议：**\n1. 约定公共区域规则（杂物24h内清理）\n2. 沟通时多用「我感觉……」而非「你总是……」\n3. 先冷静，情绪激动时不谈实质问题\n\n📤 可以共享这份分析给对方，一起看看 →",
};

function aiFollowup(q:string,chatId:number):string{
  const lq=q.toLowerCase();
  if(lq.includes("中山陵")||lq.includes("游玩")||lq.includes("攻略"))return `🗺️ **中山陵游玩攻略**\n\n**主要景点（建议顺序）：**\n1. 🏛️ 博爱坊 → 陵门 → 碑亭（20min）\n2. 🪜 石阶长廊 — 台阶392步（20min）\n3. ⛩️ 祭堂 — 中山先生坐像（20min）\n4. 🌸 梅花山 — 园内赏花（30min）\n\n**实用提示：**\n• 门票免费，需提前在公众号实名预约\n• 穿平底鞋！石阶很多\n• 带充电宝，上山信号较差`;
  if(lq.includes("谁对")||lq.includes("谁正确")||lq.includes("谁的做法"))return `⚖️ **客观分析：谁对谁错？**\n\n两人都有合理之处，也都有需要改进的地方：\n\n**老钱的诉求是合理的：** 集体生活确实需要维护共享空间。\n\n**你指出的问题也成立：** 「你太敏感」是典型的「否定感受」表达，会关闭沟通渠道。\n\n**结论：** 老钱的诉求合理，但表达方式需改善；你的感受合理，但也应承认行为有改进空间。这是沟通方式冲突而非价值观冲突，更容易解决。`;
  if(lq.includes("冲突")||lq.includes("矛盾")||lq.includes("化解")||lq.includes("应对"))return `🤝 **冲突化解策略**\n\n**短期（今晚可以做的）：**\n1. 双方都冷静20分钟再继续谈\n2. 主动说「我承认桌子确实有点乱，我这两天整理一下」\n3. 也可以说「我希望我们能更平和地说这些」\n\n**长期（建立规则）：**\n• 约定：桌面杂物24h内清理\n• 快递盒收到就拆，当天扔\n\n**关键心法：** 先处理情绪，再解决问题。`;
  if(lq.includes("互动游戏")||lq.includes("游戏规则")||lq.includes("闯关"))return `🎮 **「青春知识闯关」详细规则**\n\n**赛制（3轮，共20分钟）：**\n\n**第1轮·个人闯关（5分钟）**\n• 五四运动历史知识10题\n• 答对6题以上获「青年先锋」称号\n\n**第2轮·队伍竞赛（8分钟）**\n• 分6支队，每队5人抢答20题\n• 积分最高队伍晋级\n\n**第3轮·团队协作（7分钟）**\n• 全场组成2个大队完成「青春拼图」\n\n💡 每轮之间穿插30秒背景音乐，保持节奏`;
  if(lq.includes("经费")||lq.includes("预算"))return `💰 **经费分配建议（总3000元）**\n\n• 演出道具：800（租借为主）\n• 场地布置：800（背景板+气球+灯条）\n• 奖品：700（书籍/文创，可找校内赞助）\n• 主持服装：200（租借）\n• 备用：500（强烈建议保留）\n\n**省钱技巧：**\n• 道具优先租借\n• 奖品可联系校内文创店赞助`;
  if(lq.includes("团建")||lq.includes("协会"))return `📅 **团建时间分析**\n\n根据18位成员的回复：\n\n**最优：5月10日后的周六下午（88%，16/18）**\n• 考虑到冯同学10号有项目\n• 周六下午大家精力最好\n\n**备选：工作日晚上（78%，14/18）**\n• 适合轻度活动，时间较短\n\n💡 **团建内容建议：** 密室逃脱（2-3小时）或桌游+吃饭，周六下午都适合`;
  if(lq.includes("例会")||lq.includes("秘书处"))return `📋 **例会时间方案**\n\n**推荐：每周二早上 8:30-9:30**\n\n✅ 优点：\n• 参与率最高（82%，14/17人）\n• 照顾了郑同学（只有周二早上）\n• 早上头脑清晰，效率高\n\n**执行建议：**\n• 3位不能参与的同学提前发书面意见\n• 会议控制在1小时内\n• 线上同步会议纪要`;
  if(lq.includes("ddl")||lq.includes("截止")||lq.includes("待办"))return `⏰ **近期DDL汇总**\n\n🔴 **紧急（5天内）：**\n• 创新创业大赛初赛 → 5月6日 23:59\n\n🟠 **重要（10天内）：**\n• 计网第三章作业 → 5月9日 23:59\n\n🟡 **待关注：**\n• 数据结构实验 → 5月15日\n• 操作系统实验3答辩 → 5月7日 14:00`;
  const chat=CHATS.find(c=>c.id===chatId);
  return `我理解你问的是「${q}」。\n\n基于「${chat?.name||"当前对话"}」的内容，我可以帮你：\n• 总结关键信息和待办\n• 提取时间节点和DDL\n• 提供行动建议\n\n试试问我更具体的问题！`;
}

function partnerFirstMsg(chatId:number):string{
  const m:Record<number,string>={
    20:"这份总结超全！经费那块我觉得演出道具可以再压一点，奖品那边充实一下，观众参与感更强",
    21:"……我看了。Q仔说的「沟通时多用我感觉而非你总是」这点，我确实做得不太好",
    13:"我也看完了！中山陵那个攻略很有用，我们需要提前预约吗",
    3: "师弟，这个总结我也看到了，关于曝光量的问题你可以再向翁老师确认一下",
  };
  return m[chatId]||"";
}

function getReminderStyles(event:ScheduleEvent){
  const title=event.title;
  const dl=`${event.date.slice(5).replace("-","/")} ${event.startTime}`;
  return [
    {label:"温柔学姐风",icon:"🌸",text:`亲爱的，「${title}」快到啦哦～（${dl}），记得提前准备，加油你可以的！🌸`},
    {label:"毒舌室友风",icon:"😤",text:`喂！「${title}」，${dl}，你确定你准备好了？！别到时候哭哭啼啼说来不及了！😤`},
    {label:"佛系朋友风",icon:"🧘",text:`嗯……「${title}」好像快了……（${dl}）……随缘吧……但……还是……做一下？🧘`},
    {label:"正经班委风",icon:"📋",text:`[提醒] 「${title}」时间节点为 ${dl}，请相关同学按时完成，不接受事后补交。`},
  ];
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
  if(f==="high")return caps.filter(c=>c.importance==="high"||c.type==="conflict");
  if(f==="conflict")return caps.filter(c=>c.type==="conflict");
  if(f==="confirmed")return caps.filter(c=>c.type==="confirmed");
  if(f==="week")return caps.filter(c=>c.createdAt===TODAY||c.new);
  return caps;
}
const EF:EventForm={title:"",date:TODAY,startTime:"09:00",endTime:"10:00",location:"",type:"class",priority:"medium"};
const colorMap:Record<string,string>={class:"#E3F2FD",task:"#FFE7BA",event:"#F0FFF4",exam:"#FFF0F6"};

// ═══════════════════════════════════════════════════════════
//  主组件
// ═══════════════════════════════════════════════════════════
export default function QCapsuleDemo(){
  const [activeChat,    setActiveChat]    = useState(2);
  const [messages,      setMessages]      = useState(MSGS);
  const [capsules,      setCapsules]      = useState<Capsule[]>(INIT_CAPS);
  const [schedule,      setSchedule]      = useState<ScheduleEvent[]>(INIT_SCH);
  const [unreadMap,     setUnreadMap]     = useState<Record<number,number>>(()=>Object.fromEntries(CHATS.map(c=>[c.id,c.unread])));
  const [newCapIds,     setNewCapIds]     = useState<number[]>([101,102,103,105,106]);
  const [flyingCap,     setFlyingCap]     = useState<number|null>(null);
  const [toast,         setToast]         = useState<{msg:string;color:string}|null>(null);
  const [rightTab,      setRightTab]      = useState<"schedule"|"capsule">("schedule");
  const [dailyReport,   setDailyReport]   = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [searchKw,      setSearchKw]      = useState("");
  const [reminderEv,    setReminderEv]    = useState<ScheduleEvent|null>(null);
  const [selStyle,      setSelStyle]      = useState(0);
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
  // 新增
  const [selectMode,    setSelectMode]    = useState(false);
  const [selMsgIds,     setSelMsgIds]     = useState<Set<number>>(new Set());
  const [sharedMode,    setSharedMode]    = useState<SharedMode>(null);
  const [highlightId,   setHighlightId]   = useState<number|null>(null);
  const [groupSchedM,   setGroupSchedM]   = useState<{chatId:number}|null>(null);

  const chatEndRef=useRef<HTMLDivElement>(null);
  const aiEndRef  =useRef<HTMLDivElement>(null);
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages,activeChat]);
  useEffect(()=>{aiEndRef.current?.scrollIntoView({behavior:"smooth"});},[aiMessages,aiLoading]);
  useEffect(()=>{const fn=()=>setCtxMenu(null);window.addEventListener("click",fn);return()=>window.removeEventListener("click",fn);},[]);
  useEffect(()=>{setSelectMode(false);setSelMsgIds(new Set());},[activeChat]);

  const showToast=(msg:string,color="#52C41A")=>{setToast({msg,color});setTimeout(()=>setToast(null),2800);};

  const handleSelectChat=(id:number)=>{
    setActiveChat(id);setUnreadMap(prev=>({...prev,[id]:0}));
    if(aiChatId!==id)setAiVisible(false);
  };

  // ── AI面板 ──────────────────────────────────────────────
  const openAI=useCallback((chatId:number,prefill?:string)=>{
    setAiChatId(chatId);setAiVisible(true);setAiInput("");setSharedMode(null);
    if(aiChatId!==chatId){
      setAiMessages([]);setAiLoading(true);
      setTimeout(()=>{
        const sum=AI_SUM[chatId]||`📋 **对话总结**\n\n基于「${CHATS.find(c=>c.id===chatId)?.name}」的内容分析。\n\n💡 你可以问我具体问题`;
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

  const sendAI=(text?:string)=>{
    const q=text||aiInput.trim();if(!q)return;
    setAiMessages(p=>[...p,{role:"user",content:q}]);setAiInput("");setAiLoading(true);
    setTimeout(()=>{setAiMessages(p=>[...p,{role:"ai",content:aiFollowup(q,aiChatId||activeChat)}]);setAiLoading(false);},900);
  };

  // ── 共享AI ──────────────────────────────────────────────
  const handleShareAI=()=>{
    const chat=CHATS.find(c=>c.id===aiChatId);
    if(!chat||chat.type!=="private")return;
    setSharedMode({chatId:aiChatId!,partnerName:chat.name,partnerColor:chat.color});
    showToast(`🤝 已共享给 ${chat.name}，对方正在加入…`,"#7B68EE");
    setTimeout(()=>{
      setAiMessages(p=>[...p,{role:"ai",content:`🤝 **协作模式已开启**\n\n**${chat.name}** 已加入对话，你们可以一起基于这份总结沟通，也可以各自向 Q仔 提问，对方能看到所有内容。`}]);
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

  // ── 多选 ─────────────────────────────────────────────────
  const toggleSelectMode=()=>{setSelectMode(p=>!p);setSelMsgIds(new Set());};
  const toggleMsgSel=(id:number)=>setSelMsgIds(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const MULTI_CTX:Record<number,string>={
    13:"这是我和朋友小美关于周末出游的私聊对话。请帮我：\n1.总结出游计划的确认情况（时间/地点/人员）\n2.梳理还需要准备的事项\n3.给出出行小建议",
    20:"这是我和策划部同学关于活动方案设计的讨论。请帮我：\n1.总结已确认的方案核心要点\n2.梳理还未解决的问题\n3.给出下一步行动建议",
    21:"这是我和室友之间发生矛盾争执的对话。请帮我：\n1.客观总结双方的核心诉求\n2.分析矛盾的直接原因和深层原因\n3.给出缓和关系的具体建议",
    3: "这是我和师兄关于实验进展的私聊。请帮我：\n1.总结当前实验的关键问题\n2.梳理师兄给出的建议\n3.提炼下一步实验方向",
    10:"这是我和队友关于比赛项目的沟通。请帮我：\n1.总结项目当前进展和分工\n2.梳理待解决的问题\n3.提醒即将到来的截止时间",
    14:"这是我和班长的私聊对话。请帮我：\n1.总结班长提到的待办事项\n2.梳理需要我回应的内容\n3.给出行动建议",
    15:"这是我和妈妈的对话。请帮我：\n1.总结家里的近况\n2.提炼妈妈的关心和嘱咐\n3.给我一个温暖的回复建议",
  };
  const handleMultiAI=()=>{
    const msgs=(messages[activeChat]||[]).filter(m=>selMsgIds.has(m.id)&&!m.isSystem);
    if(!msgs.length)return;
    const content=msgs.map(m=>`[${m.self?"我":m.sender}]: ${m.content}`).join("\n");
    const ctx=MULTI_CTX[activeChat]||"请帮我：\n1.提炼核心信息 2.是否有待办事项 3.建议行动";
    const q=`【选中了 ${msgs.length} 条消息，请基于以下上下文分析】\n\n${ctx}\n\n---\n选中的消息内容：\n${content.slice(0,700)}`;
    setSelectMode(false);setSelMsgIds(new Set());
    openAI(activeChat,q);setRightTab("schedule");
  };


  // ── 右键菜单 ────────────────────────────────────────────
  const handleCM=(e:React.MouseEvent,msg:Message,cid:number)=>{e.preventDefault();e.stopPropagation();setCtxMenu({x:e.clientX,y:e.clientY,msg,cid});};
  const handleAIMsg=(msg:Message,cid:number)=>{setCtxMenu(null);openAI(cid,`请帮我分析这条消息：\n\n"${msg.content.slice(0,200)}"\n\n提炼：1.核心信息 2.是否有待办 3.建议行动`);setActiveChat(cid);setUnreadMap(p=>({...p,[cid]:0}));};
  const handleDDL=(msg:Message,cid:number)=>{
    setCtxMenu(null);
    const sched=extractDDL(msg.content);
    const chat=CHATS.find(c=>c.id===cid);
    const cap:Capsule={id:Date.now(),type:sched?"pending":"plan",importance:sched?"high":"low",group:chat?.name||"",title:`📎 ${msg.content.slice(0,25)}…`,content:msg.content.slice(0,120),time:msg.time,from:msg.sender,new:true,createdAt:TODAY,scheduleData:sched||undefined};
    setCapsules(p=>[cap,...p]);setNewCapIds(p=>[cap.id,...p]);setFlyingCap(cap.id);setRightTab("capsule");
    setTimeout(()=>setFlyingCap(null),800);showToast(sched?"🟡 DDL已抓取，飞入胶囊栏":"🔵 内容已提取为参考胶囊",sched?"#FA8C16":"#3B82F6");
  };
  const handleEnterSel=(msg:Message,cid:number)=>{
    setCtxMenu(null);
    if(activeChat!==cid){setActiveChat(cid);setUnreadMap(p=>({...p,[cid]:0}));}
    setSelectMode(true);setSelMsgIds(new Set([msg.id]));showToast("☑️ 多选模式已开启，点击气泡选中","#4A90D9");
  };

  // ── 日程 ─────────────────────────────────────────────────
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

  // ── 胶囊确认 ─────────────────────────────────────────────
  const confirmCap=(id:number)=>{
    const cap=capsules.find(c=>c.id===id);
    setCapsules(p=>p.map(c=>c.id===id?{...c,type:"confirmed",new:false}:c));
    setNewCapIds(p=>p.filter(i=>i!==id));
    if(cap?.scheduleData){
      const nid=Date.now();
      const ev:ScheduleEvent={id:nid,date:cap.scheduleData.date||TODAY,startTime:cap.scheduleData.startTime||"09:00",endTime:cap.scheduleData.endTime||"10:00",title:cap.scheduleData.title||cap.title,location:cap.scheduleData.location,type:cap.scheduleData.type||"task",color:cap.scheduleData.color||"#FFE7BA",priority:cap.scheduleData.priority||"medium",fromCapsule:true,groupName:cap.group};
      setSchedule(p=>{const ex=p.some(e=>e.title===ev.title&&e.date===ev.date);return ex?p:[...p,ev];});
      setSchDate(ev.date);setRightTab("schedule");
      setTimeout(()=>setHighlightId(nid),200);setTimeout(()=>setHighlightId(null),3000);
      showToast("✅ 已确认，已跳转至日程表","#52C41A");
    } else {showToast("✅ 胶囊已确认","#52C41A");}
  };
  const dismissCap=(id:number)=>{setCapsules(p=>p.filter(c=>c.id!==id));setNewCapIds(p=>p.filter(i=>i!==id));showToast("已忽略该胶囊","#8C8C8C");};

  // ── Demo ──────────────────────────────────────────────────
  const simDDL=()=>{
    setActiveChat(4);setUnreadMap(p=>({...p,4:0}));
    setTimeout(()=>setMessages(p=>({...p,4:[...p[4],{id:Date.now(),sender:"张老师",content:"再次补充：作业5月9日23:59截止，双平台提交，不接受补交！",time:"22:05",self:false}]})),400);
    setTimeout(()=>{
      const cap:Capsule={id:Date.now(),type:"pending",importance:"high",group:"计算机网络 · 课程群",title:"📎 作业补充要求",content:"学习通也要交！5/9 23:59 截止，不接受补交",time:"22:05",from:"张老师",new:true,createdAt:TODAY,scheduleData:{date:"2026-05-09",startTime:"23:00",endTime:"23:59",title:"📎 计网作业截止",type:"task",color:"#FFE7BA",priority:"high"}};
      setCapsules(p=>[cap,...p]);setNewCapIds(p=>[cap.id,...p]);setFlyingCap(cap.id);setRightTab("capsule");
      setTimeout(()=>setFlyingCap(null),800);showToast("🟡 新胶囊已捕获","#FA8C16");
    },1100);
  };
  const simConflict=()=>{
    setActiveChat(7);setUnreadMap(p=>({...p,7:0}));
    setTimeout(()=>{
      const cap:Capsule={id:Date.now(),type:"conflict",importance:"high",group:"班级群 × 创新赛",title:"🚨 5/18 时间冲突",content:"5/18 紫金山团建（全天）\n5/18 创新创业讲座（10:00-12:00）\n两者重叠，需取舍",time:"20:20",from:"AI 冲突检测",new:true,createdAt:TODAY};
      setCapsules(p=>[cap,...p]);setNewCapIds(p=>[cap.id,...p]);setFlyingCap(cap.id);setRightTab("capsule");
      setTimeout(()=>setFlyingCap(null),800);showToast("🔴 冲突检测！已生成红色胶囊","#FF4D4F");
    },600);
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

  // ── 计算 ─────────────────────────────────────────────────
  const weekDays=Array.from({length:7},(_,i)=>addDays(weekStart,i));
  const eventDates=new Set(schedule.map(e=>e.date));
  const dayEvs=schedule.filter(e=>e.date===schDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  const currentChat=CHATS.find(c=>c.id===activeChat);
  const isPrivate=currentChat?.type==="private";
  const filteredChats=CHATS.filter(c=>!searchKw||c.name.toLowerCase().includes(searchKw.toLowerCase()));
  const pendingCount=capsules.filter(c=>c.type==="pending"||c.type==="conflict").length;
  const totalUnread=Object.values(unreadMap).reduce((s,v)=>s+v,0);
  const filteredCaps=filterCaps(capsules,capFilter);
  const remStyles=reminderEv?getReminderStyles(reminderEv):[];

  // ─────────────────────────────────────────────────────────
  //  渲染
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",background:"#F0F2F5",fontFamily:"'PingFang SC','Microsoft YaHei',sans-serif",overflow:"hidden",position:"relative",color:"#333"}}>

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 22px",borderRadius:24,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.18)"}}>{toast.msg}</div>}

      {/* 右键菜单 */}
      {ctxMenu&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"fixed",left:ctxMenu.x,top:ctxMenu.y,background:"#fff",border:"1px solid #E5E8EE",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.14)",zIndex:9998,minWidth:165,overflow:"hidden"}}>
          {CHATS.find(c=>c.id===ctxMenu.cid)?.type==="private"&&(
            <>
              <div onClick={()=>handleEnterSel(ctxMenu.msg,ctxMenu.cid)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                ☑️ 进入多选
              </div>
              <div style={{height:1,background:"#F0F0F0"}}/>
            </>
          )}
          <div onClick={()=>handleAIMsg(ctxMenu.msg,ctxMenu.cid)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            ✨ AI总结此消息
          </div>
          {CHATS.find(c=>c.id===ctxMenu.cid)?.type==="group"&&(
            <>
              <div style={{height:1,background:"#F0F0F0"}}/>
              <div onClick={()=>handleDDL(ctxMenu.msg,ctxMenu.cid)} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                📎 DDL抓取此内容
              </div>
            </>
          )}
          <div style={{height:1,background:"#F0F0F0"}}/>
          <div onClick={()=>{navigator.clipboard?.writeText(ctxMenu.msg.content).catch(()=>{});setCtxMenu(null);}} style={{padding:"9px 14px",cursor:"pointer",fontSize:12.5,color:"#666",display:"flex",alignItems:"center",gap:7}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#F5F7FA"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
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
            const lastMsgs=messages[chat.id]||[];
            const previewMsg=lastMsgs[lastMsgs.length-1];
            const previewText=previewMsg?(previewMsg.isSystem?previewMsg.content:`${previewMsg.self?"":previewMsg.sender+": "}${previewMsg.content.replace(/\n/g," ").slice(0,20)}`):chat.lastMsg;
            const unread=unreadMap[chat.id]||0;
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
            <div style={{fontSize:10,color:"#999"}}>群聊监听中 · 已抓 {capsules.length} 个胶囊</div>
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

        {/* 多选提示条 */}
        {selectMode&&(
          <div style={{background:"#E8F0FE",padding:"6px 20px",borderBottom:"1px solid #BAE0FF",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:"#4A90D9",fontWeight:600}}>☑️ 多选模式 · 已选 {selMsgIds.size} 条（点击气泡选中）</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={handleMultiAI} disabled={selMsgIds.size===0} style={{padding:"4px 12px",borderRadius:8,border:"none",background:selMsgIds.size>0?"linear-gradient(135deg,#4A90D9,#7B68EE)":"#ccc",color:"#fff",fontSize:11,fontWeight:600,cursor:selMsgIds.size>0?"pointer":"default"}}>
                ✨ AI总结选中 ({selMsgIds.size}条)
              </button>
              <button onClick={()=>{setSelectMode(false);setSelMsgIds(new Set());}} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #BAE0FF",background:"transparent",color:"#666",fontSize:11,cursor:"pointer"}}>✗ 取消</button>
            </div>
          </div>
        )}

        {/* 消息区 */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 20px",display:"flex",flexDirection:"column",gap:4}}>
          {(messages[activeChat]||[]).map((msg,idx)=>{
            const prev=(messages[activeChat]||[])[idx-1];
            const showDate=msg.date&&(!prev||prev.date!==msg.date);
            const isSelected=selMsgIds.has(msg.id);
            if(msg.isSystem)return(
              <div key={msg.id}>
                {showDate&&<div style={{textAlign:"center",margin:"16px 0 12px",fontSize:11,color:"#999"}}><span style={{background:"#E5E8EE",padding:"3px 12px",borderRadius:10}}>{msg.date}</span></div>}
                <div style={{textAlign:"center",margin:"6px 0",fontSize:11,color:"#999"}}>{msg.content}</div>
              </div>
            );
            return(
              <div key={msg.id}>
                {showDate&&<div style={{textAlign:"center",margin:"16px 0 12px",fontSize:11,color:"#999"}}><span style={{background:"#E5E8EE",padding:"3px 12px",borderRadius:10}}>{msg.date}</span></div>}
                <div style={{display:"flex",flexDirection:msg.self?"row-reverse":"row",alignItems:"flex-start",gap:8,marginBottom:10,background:isSelected?"rgba(74,144,217,0.08)":"transparent",borderRadius:8,padding:isSelected?"4px 6px":"0",cursor:selectMode?"pointer":"default"}}
                  onClick={selectMode?()=>toggleMsgSel(msg.id):undefined}>
                  {selectMode&&isPrivate&&(
                    <div style={{display:"flex",alignItems:"center",order:msg.self?2:0,flexShrink:0,margin:msg.self?"0 0 0 4px":"0 4px 0 0",marginTop:10}}>
                      <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${isSelected?"#4A90D9":"#ccc"}`,background:isSelected?"#4A90D9":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {isSelected&&<span style={{color:"#fff",fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
                      </div>
                    </div>
                  )}
                  <div style={{width:36,height:36,borderRadius:6,flexShrink:0,background:msg.isAI?"linear-gradient(135deg,#4A90D9,#9B59B6)":msg.self?"linear-gradient(135deg,#4A90D9,#7B68EE)":`hsl(${(msg.sender.charCodeAt(0)*17)%360},60%,60%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>
                    {msg.isAI?"Q":msg.self?"我":msg.sender.slice(0,1)}
                  </div>
                  <div style={{maxWidth:"62%",display:"flex",flexDirection:"column",alignItems:msg.self?"flex-end":"flex-start"}}>
                    {!msg.self&&<div style={{fontSize:11,color:msg.isAI?"#4A90D9":"#666",marginBottom:3,fontWeight:msg.isAI?600:400}}>{msg.isAI?"Q 仔 · AI助手":msg.sender}<span style={{color:"#bbb",marginLeft:6,fontSize:10}}>{msg.time}</span></div>}
                    <div onContextMenu={e=>handleCM(e,msg,activeChat)}
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
                  <div style={{fontSize:10,color:"#999"}}>基于「{CHATS.find(c=>c.id===aiChatId)?.name}」{sharedMode&&` · 与 ${sharedMode.partnerName} 共同查看`}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {/* 私聊才显示共享按钮 */}
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
                      <div style={{padding:"9px 12px",borderRadius:isUser?"10px 4px 10px 10px":"4px 10px 10px 10px",background:isUser?"#A6D8FF":isPartner?`${partnerColor}22`:"#F5F7FA",fontSize:12.5,color:"#333",lineHeight:1.6,whiteSpace:"pre-line",border:`1px solid ${isUser?"transparent":isPartner?`${partnerColor}55`:"#E5E8EE"}`}}>
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

            {(
              <div style={{padding:"8px 14px",borderTop:"1px solid #F0F0F0",flexShrink:0}}>
                <div style={{fontSize:10.5,color:"#999",marginBottom:7}}>
                  {aiMessages.length<=1?"快速提问":"继续追问"}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(
                    aiChatId===13?["出游路线怎么安排🗺️","需要提前预约吗🎫","附近有什么好吃的🍜","拍照技巧推荐📷"]:
                    aiChatId===20?["互动游戏规则怎么设计🎮","经费分配合理吗💰","宣传物料准备什么📢","主持人怎么选"]:
                    aiChatId===21?["谁的做法正确⚖️","如何化解这次冲突🤝","怎么建立宿舍规则📋","我需要道歉吗💬"]:
                    aiChatId===3? ["曝光量参数怎么调⚗️","下次组会准备什么📊","彩色样品进度评估","横向周期偏差原因"]:
                    aiChatId===10?["PPT哪里还需要改进📋","商业模式怎么写💡","还有哪些DDL⏰","答辩要注意什么"]:
                    aiChatId===14?["待办事项清单📝","团建需要准备什么🏔️","班费怎么转账💳","班会注意事项"]:
                    aiChatId===15?["帮我想一句感谢妈妈的话💝","假期回家需要准备什么","妈妈关心的事情汇总","如何回复让她放心"]:
                    aiChatId===18?["最佳团建时间📅","团建活动内容建议🎉","预算大概多少💰","地点怎么选📍"]:
                    aiChatId===19?["最佳例会时间推荐📋","如何通知全体成员📢","会议效率怎么提高","缺席成员怎么处理"]:
                    aiChatId===1||aiChatId===9?["还有哪些DDL⏰","初赛要提交什么📦","评分标准是什么📊","有什么注意事项"]:
                    aiChatId===4?["作业提交要求📝","有哪些DDL⏰","期末考试安排🎓","重点知识点是什么"]:
                    aiChatId===2?["今日组会准备什么📊","实验进展汇报要点","有哪些待办⏰","曝光量参数建议"]:
                    ["最近有哪些DDL⏰","总结一下待办📝","今天需要做什么","有什么重要通知"]
                  ).map((q,i)=>(
                    <button key={i} onClick={()=>sendAI(q)} style={{padding:"5px 10px",borderRadius:12,border:"1px solid #E5E8EE",background:"#FAFBFD",color:"#4A90D9",fontSize:11,fontWeight:500,cursor:"pointer"}}>{q}</button>
                  ))}
                </div>
              </div>
            )}


            <div style={{padding:"10px 12px",borderTop:"1px solid #F0F0F0",display:"flex",gap:6,flexShrink:0}}>
              <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&aiInput.trim())sendAI();}} placeholder={sharedMode?`你和 ${sharedMode.partnerName} 可以一起问 Q仔…`:"问问Q仔，如「中山陵游玩推荐」"} style={{flex:1,height:32,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:12,outline:"none",color:"#333"}}/>
              <button onClick={()=>sendAI()} style={{padding:"0 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>发送</button>
            </div>
          </div>
        )}

        {/* ─ 日程/胶囊 Tab ─ */}
        {!aiVisible&&(
          <>
            <div style={{display:"flex",borderBottom:"1px solid #E5E5E5",background:"#FAFBFD",flexShrink:0}}>
              {[{key:"schedule",label:"📅 日程",count:0},{key:"capsule",label:"🟡 胶囊",count:pendingCount}].map(tab=>(
                <button key={tab.key} onClick={()=>setRightTab(tab.key as "schedule"|"capsule")} style={{flex:1,padding:"12px",border:"none",background:rightTab===tab.key?"#fff":"transparent",color:rightTab===tab.key?"#4A90D9":"#666",fontSize:12.5,fontWeight:rightTab===tab.key?700:500,cursor:"pointer",borderBottom:rightTab===tab.key?"2px solid #4A90D9":"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {tab.label}{tab.count>0&&<span style={{background:rightTab===tab.key?"#4A90D9":"#FA8C16",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{tab.count}</span>}
                </button>
              ))}
            </div>

            {/* ─ 日程表 ─ */}
            {rightTab==="schedule"&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
                <div style={{padding:"10px 12px",background:"linear-gradient(135deg,#F5F0FF 0%,#FFF0F5 100%)",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                  <div style={{fontSize:11,color:"#9B59B6",fontWeight:600,marginBottom:6}}>2024-2025学年 第2学期</div>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>
                    <button onClick={()=>setWeekStart(addDays(weekStart,-7))} style={{border:"none",background:"transparent",cursor:"pointer",color:"#666",fontSize:16,padding:"0 4px"}}>◀</button>
                    <div style={{flex:1,display:"flex",gap:3}}>
                      {weekDays.map(d=>{
                        const hasEv=eventDates.has(d);
                        const isToday=d===TODAY;
                        const isSel=d===schDate;
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
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#333"}}>{formatDate(schDate)} {getDayName(schDate)}</div>
                    <button onClick={openAddEv} style={{padding:"3px 10px",borderRadius:8,border:"1.5px solid #4A90D9",background:"transparent",color:"#4A90D9",fontSize:11,fontWeight:600,cursor:"pointer"}}>+ 添加</button>
                  </div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:7,minHeight:0}}>
                  {dayEvs.length===0?(
                    <div style={{padding:30,textAlign:"center",color:"#bbb",fontSize:13}}>暂无日程 🐟<br/><span style={{fontSize:11}}>点击「+ 添加」新建日程</span></div>
                  ):dayEvs.map(ev=>{
                    const pc=prColor(ev.priority);
                    const isHL=highlightId===ev.id;
                    return(
                      <div key={ev.id} onClick={()=>setReminderEv(ev)}
                        style={{display:"flex",gap:8,padding:"9px 11px",background:ev.color,borderRadius:9,border:isHL?`2px solid ${pc}`:"1px solid rgba(0,0,0,0.06)",cursor:"pointer",transition:"all 0.3s",transform:isHL?"scale(1.02)":"scale(1)",boxShadow:isHL?`0 0 0 3px ${pc}33,0 4px 14px rgba(0,0,0,0.1)`:undefined}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-1px)";(e.currentTarget as HTMLElement).style.boxShadow="0 4px 12px rgba(0,0,0,0.1)";}}
                        onMouseLeave={e=>{if(highlightId!==ev.id){(e.currentTarget as HTMLElement).style.transform="";(e.currentTarget as HTMLElement).style.boxShadow="";}}}>
                        <div style={{width:4,borderRadius:2,background:pc,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:"#333",display:"flex",alignItems:"center",gap:6}}>
                            {ev.title}
                            {isHL&&<span style={{fontSize:10,background:pc,color:"#fff",padding:"1px 5px",borderRadius:6,fontWeight:600,flexShrink:0}}>✨新</span>}
                            <span style={{fontSize:10,background:pc+"22",color:pc,padding:"1px 5px",borderRadius:6,fontWeight:600,flexShrink:0}}>{ev.priority==="high"?"紧急":ev.priority==="medium"?"重要":"一般"}</span>
                          </div>
                          <div style={{fontSize:10.5,color:"#666",marginTop:2}}>🕒 {ev.startTime}–{ev.endTime}{ev.location&&<span style={{marginLeft:8}}>📍 {ev.location}</span>}</div>
                          {ev.fromCapsule&&<div style={{fontSize:10,color:"#4A90D9",marginTop:2,fontWeight:600}}>🟡 来自胶囊 · {ev.groupName}</div>}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                          <button onClick={e=>{e.stopPropagation();openEditEv(ev);}} style={{padding:"2px 7px",borderRadius:5,border:"1px solid #d0d0d0",background:"#fff",color:"#666",fontSize:10,cursor:"pointer"}}>✏️</button>
                          <button onClick={e=>{e.stopPropagation();deleteEv(ev.id);}} style={{padding:"2px 7px",borderRadius:5,border:"1px solid #ffa39e",background:"#fff",color:"#FF4D4F",fontSize:10,cursor:"pointer"}}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{padding:"6px 12px",borderTop:"1px solid #F0F0F0",background:"#FAFBFD",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontSize:10,color:"#999"}}>优先级：</span>
                  {[{c:"#FF4D4F",l:"紧急"},{c:"#FA8C16",l:"重要"},{c:"#52C41A",l:"一般"}].map(({c,l})=>(
                    <span key={l} style={{fontSize:10,display:"flex",alignItems:"center",gap:3}}><span style={{width:6,height:6,borderRadius:"50%",background:c,display:"inline-block"}}/>{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ─ 时间胶囊 ─ */}
            {rightTab==="capsule"&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
                <div style={{padding:"8px 12px",borderBottom:"1px solid #F0F0F0",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    {(["all","week","high","conflict","confirmed"] as CapsuleFilter[]).map(f=>{
                      const labels:Record<string,string>={all:"全部",week:"近一周",high:"🔴 紧急",conflict:"⚠️ 冲突",confirmed:"✅ 已确认"};
                      return <button key={f} onClick={()=>setCapFilter(f)} style={{padding:"3px 8px",borderRadius:8,border:"1px solid "+(capFilter===f?"#4A90D9":"#E5E8EE"),background:capFilter===f?"#E8F0FE":"transparent",color:capFilter===f?"#4A90D9":"#666",fontSize:11,fontWeight:capFilter===f?700:400,cursor:"pointer"}}>{labels[f]}</button>;
                    })}
                    <button onClick={()=>setShowLegend(!showLegend)} style={{marginLeft:"auto",padding:"3px 8px",borderRadius:8,border:"1px solid #E5E8EE",background:"transparent",color:"#666",fontSize:11,cursor:"pointer"}}>? 图例</button>
                  </div>
                  {showLegend&&(
                    <div style={{background:"#FAFBFD",border:"1px solid #E5E8EE",borderRadius:8,padding:"8px 10px",marginTop:4}}>
                      {[{e:"🔴",l:"紧急",d:"时间冲突或3天内截止"},{e:"🟠",l:"重要",d:"一周内截止"},{e:"🟡",l:"一般",d:"普通待办"},{e:"🟢",l:"已确认",d:"已写入日程"},{e:"🔵",l:"方案参考",d:"规划信息"},{e:"⚫",l:"敏感",d:"隐私保护"}].map(({e,l,d})=>(
                        <div key={l} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,fontSize:11}}><span>{e}</span><span style={{fontWeight:600,color:"#333",width:50}}>{l}</span><span style={{color:"#999"}}>{d}</span></div>
                      ))}
                    </div>
                  )}
                  <div style={{fontSize:11,color:"#999",marginTop:2}}>显示 {filteredCaps.length}/{capsules.length} 个胶囊</div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
                  {filteredCaps.length===0&&<div style={{textAlign:"center",padding:30,color:"#bbb",fontSize:13}}>暂无符合条件的胶囊</div>}
                  {filteredCaps.map(cap=>{
                    const st=getCS(cap);
                    const isNew=newCapIds.includes(cap.id);
                    const isFlying=flyingCap===cap.id;
                    return(
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
                            <button onClick={()=>confirmCap(cap.id)} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",background:st.badge,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>✓ {cap.scheduleData?"确认入日程":"确认"}</button>
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
          </>
        )}
      </div>

      {/* ══ 演示按钮 ══ */}
      <div style={{position:"fixed",bottom:16,left:380,background:"rgba(255,255,255,0.97)",border:"1px solid #E5E5E5",borderRadius:18,padding:"8px 14px",display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",maxWidth:480,boxShadow:"0 8px 32px rgba(0,0,0,0.12)",zIndex:1000}}>
        <span style={{fontSize:11,color:"#4A90D9",fontWeight:700,marginRight:4}}>🎮 演示</span>
        {[
          {label:"📎 DDL抓取",   action:simDDL,         color:"#FA8C16"},
          {label:"🚨 冲突检测",  action:simConflict,    color:"#FF4D4F"},
          {label:"🖥️ 社团排期", action:()=>simGroupSched(18),color:"#20B2AA"},
          {label:"🏛️ 例会排期", action:()=>simGroupSched(19),color:"#9B59B6"},
          {label:"🎯 方案私聊",  action:()=>{setActiveChat(20);setUnreadMap(p=>({...p,20:0}));},color:"#36CFC9"},
          {label:"⚡ 矛盾私聊",  action:()=>{setActiveChat(21);setUnreadMap(p=>({...p,21:0}));},color:"#FA8C16"},
          {label:"📋 日报",      action:()=>setDailyReport(true),color:"#4A90D9"},
        ].map(btn=>(
          <button key={btn.label} onClick={btn.action} style={{padding:"5px 10px",borderRadius:10,border:`1.5px solid ${btn.color}55`,background:btn.color+"15",color:btn.color,fontSize:11,fontWeight:600,cursor:"pointer"}}>{btn.label}</button>
        ))}
      </div>

      {/* ══ 弹窗：添加/编辑日程 ══ */}
      {showEvModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setShowEvModal(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:"24px",width:400,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:18}}>{editingEv?"✏️ 编辑日程":"+ 添加日程"}</div>
            {([{label:"标题",key:"title",type:"text",placeholder:"日程标题"},{label:"日期",key:"date",type:"date"},{label:"开始时间",key:"startTime",type:"time"},{label:"结束时间",key:"endTime",type:"time"},{label:"地点（选填）",key:"location",type:"text",placeholder:"如：教三-204"}] as {label:string;key:string;type:string;placeholder?:string}[]).map(field=>(
              <div key={field.key} style={{marginBottom:12}}>
                <div style={{fontSize:12,color:"#666",marginBottom:4}}>{field.label}</div>
                <input type={field.type} value={(evForm as Record<string,string>)[field.key]} placeholder={field.placeholder} onChange={e=>setEvForm(p=>({...p,[field.key]:e.target.value}))} style={{width:"100%",height:34,padding:"0 10px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333",boxSizing:"border-box"}}/>
              </div>
            ))}
            <div style={{display:"flex",gap:12,marginBottom:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"#666",marginBottom:4}}>类型</div>
                <select value={evForm.type} onChange={e=>setEvForm(p=>({...p,type:e.target.value as ScheduleEvent["type"]}))} style={{width:"100%",height:34,padding:"0 8px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333"}}>
                  <option value="class">课程</option>
                  <option value="task">任务/DDL</option>
                  <option value="event">活动</option>
                  <option value="exam">考试/答辩</option>
                </select>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"#666",marginBottom:4}}>优先级</div>
                <select value={evForm.priority} onChange={e=>setEvForm(p=>({...p,priority:e.target.value as Priority}))} style={{width:"100%",height:34,padding:"0 8px",border:"1px solid #E5E8EE",borderRadius:6,fontSize:13,outline:"none",color:"#333"}}>
                  <option value="high">🔴 紧急</option>
                  <option value="medium">🟠 重要</option>
                  <option value="low">🟡 一般</option>
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

      {/* ══ 弹窗：提醒文案 ══ */}
      {reminderEv&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>{setReminderEv(null);setSentReminder(false);}}>
          <div style={{background:"#fff",borderRadius:16,padding:"26px",width:420,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:800,color:"#333",marginBottom:4}}>💬 生成提醒文案</div>
            <div style={{fontSize:12,color:"#4A90D9",background:"#EFF6FF",padding:"6px 10px",borderRadius:8,marginBottom:14,fontWeight:500}}>
              针对：{reminderEv.title}　{reminderEv.date.slice(5).replace("-","/")} {reminderEv.startTime}
              <span style={{marginLeft:8,fontSize:10,color:prColor(reminderEv.priority),fontWeight:700}}>{reminderEv.priority==="high"?"🔴 紧急":reminderEv.priority==="medium"?"🟠 重要":"🟡 一般"}</span>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
              {remStyles.map((s,i)=>(
                <button key={i} onClick={()=>setSelStyle(i)} style={{padding:"5px 10px",borderRadius:10,border:`1.5px solid ${selStyle===i?"#4A90D9":"#E5E8EE"}`,background:selStyle===i?"#E8F0FE":"#fff",color:selStyle===i?"#4A90D9":"#666",fontSize:11.5,cursor:"pointer",fontWeight:selStyle===i?700:400}}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
            <div style={{background:"#F8F9FB",border:"1px solid #E5E8EE",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#333",lineHeight:1.6,marginBottom:16,minHeight:64}}>{remStyles[selStyle]?.text}</div>
            {!sentReminder?(
              <button onClick={()=>setSentReminder(true)} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>一键发送提醒</button>
            ):(
              <div style={{textAlign:"center",color:"#52C41A",fontWeight:700,fontSize:14,padding:"10px 0"}}>✅ 提醒已发送！</div>
            )}
          </div>
        </div>
      )}

      {/* ══ 弹窗：日报 ══ */}
      {dailyReport&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>setDailyReport(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:"26px 28px",width:380,boxShadow:"0 20px 60px rgba(74,144,217,0.2)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:13,color:"#4A90D9",fontWeight:700,marginBottom:4}}>🌙 Q 仔 · 晚间日报</div>
            <div style={{fontSize:20,fontWeight:800,color:"#333",marginBottom:16}}>今天有 {pendingCount} 条待确认</div>
            {capsules.filter(c=>c.type==="pending"||c.type==="conflict").slice(0,3).map(cap=>{
              const st=getCS(cap);
              return <div key={cap.id} style={{background:st.bg,border:`1px solid ${st.border}`,borderRadius:8,padding:"9px 12px",marginBottom:6}}><div style={{fontSize:12.5,fontWeight:700,color:"#1a1a2e"}}>{cap.title}</div><div style={{fontSize:11,color:"#666",marginTop:3}}>{cap.content.slice(0,50)}…</div></div>;
            })}
            <div style={{fontSize:11,color:"#999",margin:"12px 0"}}>点击「开始确认」前往胶囊栏处理</div>
            <button onClick={()=>{setDailyReport(false);setRightTab("capsule");}} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4A90D9,#7B68EE)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>开始确认 →</button>
          </div>
        </div>
      )}

      {/* ══ 弹窗：小美群体排期（原版） ══ */}
      {scheduleModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>setScheduleModal(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:"26px",width:380}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:4}}>📅 Q 仔 · 三人出游排期</div>
            <div style={{fontSize:12,color:"#999",marginBottom:16}}>已计算三人共同空闲（隐私保护模式）</div>
            {[{time:"本周六 14:00–16:00",hot:true,date:"2026-05-02"},{time:"本周日 10:00–12:00",hot:false,date:"2026-05-03"},{time:"下周六 15:00–17:00",hot:false,date:"2026-05-09"}].map((slot,i)=>(
              <div key={i} style={{background:slot.hot?"#F5F0FF":"#FAFBFD",border:`1.5px solid ${slot.hot?"#7B68EE":"#E5E8EE"}`,borderRadius:10,padding:"11px 14px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:13,color:slot.hot?"#7B68EE":"#666",fontWeight:slot.hot?700:400}}>{slot.hot&&"🔥 "}{slot.time}</span>
                <button onClick={()=>{const nev:ScheduleEvent={id:Date.now(),date:slot.date,startTime:slot.hot?"14:00":"10:00",endTime:slot.hot?"16:00":"12:00",title:"🌸 中山陵出游",type:"event",color:"#FCE4EC",priority:"low"};setSchedule(p=>[...p,nev]);setSchDate(slot.date);setScheduleModal(false);showToast("✅ 已写入日程！","#7B68EE");}} style={{padding:"4px 11px",borderRadius:6,border:"none",background:slot.hot?"#7B68EE":"#BFBFBF",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>就这个</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ 弹窗：群体排期可视化分析 ══ */}
      {groupSchedM&&GROUP_SCHED[groupSchedM.chatId]&&(()=>{
        const data=GROUP_SCHED[groupSchedM.chatId];
        return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={()=>setGroupSchedM(null)}>
            <div style={{background:"#fff",borderRadius:16,padding:"26px",width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:4}}>📊 Q仔 · 群体排期分析</div>
              <div style={{fontSize:12,color:"#999",marginBottom:16}}>「{data.gName}」· 共 {data.total} 人参与统计</div>
              {/* 时间段可视化 */}
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
                setTimeout(()=>setHighlightId(nev.id),200);setTimeout(()=>setHighlightId(null),3000);
                setGroupSchedM(null);showToast(`✅ 已写入日程：${data.best.label}`,"#52C41A");
              }} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#52C41A,#73D13D)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ 确认最佳时间，写入日程</button>
            </div>
          </div>
        );
      })()}

      <style>{`::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#D9DCE0;border-radius:4px;}input::placeholder{color:#BFBFBF;}`}</style>
    </div>
  );
}

