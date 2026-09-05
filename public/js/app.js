/* ============================================================
 * 舒尔特方格训练 —— 前端逻辑
 * 登录：仅输入名字；同一台设备用 localStorage 记住并自动登录。
 * 训练：左侧选项栏选择规格(3×3 ~ 8×8)；开始后按 1 → N 点击并计时，
 *       训练中侧栏自动收起，可随时展开。
 * ============================================================ */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const STORE_KEY = 'schulte.username';
  const SIDEBAR_KEY = 'schulte.sidebar.collapsed';
  const LANG_PREF_KEY = 'schulte.lang.pref'; // 登录页语言偏好（本机记住）
  const SIZES = [3, 4, 5, 6, 7, 8];
  const MOBILE_QUERY = '(max-width: 1024px)'; // 手机 + iPad 用抽屉式侧栏

  /* ----------------------------------------------------------
   * 成绩评级（A–F）
   * 基准取 5×5(25 格)：A≤15s、B≤25s、C≤36s、D≤50s、E≤70s、F>70s。
   * 参考资料：12–14 岁组 16″ 优秀 / 26″ 中等 / 36″ 需强化（百度百科），
   * 成年人与训练有素者应更快。其它规格按格子数等比换算（等效到 25 格）。
   * ---------------------------------------------------------- */
  const GRADE_LIMITS = { A: 15, B: 25, C: 36, D: 50, E: 70 };

  function computeGrade(n, sec) {
    const k = (n * n) / 25;          // 换算系数：折算成 25 格的等效用时
    const eq = sec / k;
    if (eq <= GRADE_LIMITS.A) return 'A';
    if (eq <= GRADE_LIMITS.B) return 'B';
    if (eq <= GRADE_LIMITS.C) return 'C';
    if (eq <= GRADE_LIMITS.D) return 'D';
    if (eq <= GRADE_LIMITS.E) return 'E';
    return 'F';
  }

  const GRADE_SLOGANS = {
    A: [
      '堪称人形扫描仪，快得离谱！',
      '教科书级别的表现，手速一流！',
      '飞行员同款速度，请收下我的膝盖！',
      '这不是手，是装了涡轮增压！',
      '快成这样，数字都来不及眨眼。',
      '完美！你就是注意力的代名词。',
      '对手看到这成绩，直接宣布退赛。',
      '你这手速，怕是偷偷开了外挂？',
      '又快又稳，国家队在向你招手。',
      '扫描仪都自愧不如，佩服佩服。',
      '一骑绝尘，手速天花板又被你抬高了。',
      '这成绩放网上，评论区全是“大佬”。',
      '行云流水，赏心悦目！',
      '眼睛和手配合得天衣无缝。',
      '太强了，建议直接去飞行员选拔。',
      '快得让人怀疑屏幕是不是卡了。',
      '天赋异禀，说的就是你这种人。',
      '干净利落，一气呵成！',
      '这手速，朋友圈可以吹一整年。',
      '帅！这一轮给你满分，不怕你骄傲。',
    ],
    B: [
      '相当不错，离“快”只差一步之遥。',
      '手感在线，再练几轮就能封神。',
      '稳中有快，进步空间依然很大！',
      '很不错！距顶级就隔一层窗户纸。',
      '手眼配合已经很顺，继续加油！',
      '差一点点就是 A，再逼自己一把。',
      '成绩亮眼，妥妥的潜力股。',
      '快到这个程度，已经超过不少人了。',
      '节奏不错，下一轮冲 A！',
      '好手速，练下去前途无量。',
      '已经很利索了，离人形扫描仪不远。',
      '不错嘛，已经有点那味儿了。',
      '状态在线，手感正热，趁热打铁！',
      '这个速度，值得给你点个赞。',
      '再快两秒你就是 A，努努力！',
      '高手过招，就差这临门一脚。',
      '流畅度可以，细节再抠一抠就完美。',
      '发挥稳定，进步肉眼可见。',
      '有模有样了，继续保持！',
      '差点摸到顶级门槛，加油冲！',
    ],
    C: [
      '这速度……建议改名叫“温吞水”。',
      '勉强过关，但离快还差一个世纪。',
      '手是到了，脑子大概还在半路上。',
      '就这？数字都等你等到打哈欠了。',
      '慢成这样，连乌龟都想给你喊加油。',
      '你这手速，是裹着棉被在点吧？',
      '在及格线边缘反复横跳，就别装高手了。',
      '找数字全靠缘分？再回去练练吧。',
      '这成绩，也就只能骗骗自家猫。',
      '别人在找数字，你这是在找借口。',
      '手速感人，诚意也相当一般。',
      '四平八稳，像在做广播体操。',
      '点得这么慈祥，是在抚摸屏幕吗？',
      '别急，先把眼睛睁开再开始数。',
      '这效率，老板看了都想给你放长假。',
      '勉强及格，纯属运气好。',
      '慢悠悠的，数字都要打瞌睡了。',
      '手比脑子懒，这可不是好习惯。',
      '就这水平还谈手速？洗洗睡吧。',
      '成绩平平无奇，回头是岸，多练练。',
    ],
    D: [
      '再慢一点，蜗牛都能在你面前超车了。',
      '这手速是边找数字边刷手机吧？',
      '你点的是数字还是树懒？慢得离谱！',
      '闭着眼乱点，可能都比这快。',
      '手这么慢，昨晚是不是通宵了？',
      '数字都换三茬了，你才找到一半。',
      '就这效率，蚂蚁搬家都比你有章法。',
      '这速度，也就适合去银行排队办业务。',
      '慢得让人以为屏幕当场卡死了。',
      '手残不可怕，可怕的是还不承认。',
      '这成绩，闭眼玩家都不屑与你同台。',
      '你是拿筷子在戳屏幕吗？',
      '都这么慢了还没找全，尴尬不尴尬。',
      '乌龟都摇头：这我可不跟你比。',
      '手速感人，眼神更加感人。',
      '磨磨蹭蹭，数到后面自己都忘到哪了。',
      '这轮下来屏幕都快被戳出火星了，就这进度？',
      '反应弧长到能绕地球一整圈。',
      '说好的手速，怎么练成了手慢？',
      '慢到这个份上，先活动活动手指吧。',
    ],
    E: [
      '慢得如此稳定，也算是一种天赋。',
      '数到一半，是不是还顺便打了个盹？',
      '这手速，奶奶翻菜谱都比你利索。',
      '你这不是训练，是给数字做慢动作回放。',
      '手慢眼更慢，双慢合璧，慢中自有慢中手。',
      '别人一轮都跑完了，你还在找 7？',
      '这速度还好意思发成绩？先藏起来吧。',
      '简直是手速界的活体反面教材。',
      '数字看完都替你急出一头汗。',
      '你这反应速度，快递都得等成双十一。',
      '慢到犯规，裁判都想给你亮红牌。',
      '十秒能干完的活你磨了一分钟，佩服。',
      '这轮你是来散步，顺便点几个数字吧？',
      '手指是睡着了，还是冻僵了？',
      '太慢了，我家路由器重启都比你快。',
      '就这成绩，说你是闭着眼点的都有人信。',
      '手速退化现场，建议好好反思一下。',
      '磨叽成这样，队友早就翻白眼了。',
      '这表现，连“重在参与”都夸不出口。',
      '慢工出细活？可你也没出细活啊。',
    ],
    F: [
      '别测了，先睡一觉再来，数字都替你着急。',
      '建议从 3×3 重新开始修炼，别气馁。',
      '这成绩发朋友圈，够亲友团嘲一整年。',
      '你是用脚趾在点屏幕吗？',
      '手速慢到地球自转都停下来等你。',
      '这轮成绩已经慢出“人类范畴”，自成流派。',
      '数字等到花儿都谢了三轮。',
      '你确定刚才不是在梦游状态点的？',
      '快慢不重要？重要！你这慢得离谱。',
      '这表现，我奶奶都能超你十条街。',
      '慢到窒息，围观群众比你还着急。',
      '手速负数，建议先把双手找回来再玩。',
      '这成绩单贴墙上，据说能辟邪。',
      '你是在用放大镜找数字吗？',
      '慢成这样还敢开计时器，勇气可嘉。',
      '点个数字，比做人生重大决定还艰难。',
      '建议直接卸载，别为难自己和屏幕了。',
      '这手速，蜗牛看了都要摇头三连。',
      '快不起来就别硬撑了，先去休息吧。',
      '惊了！这速度连“慢”字都配不上。',
    ],
  };

  const EN_GRADE_SLOGANS = {
    A: [
      'A human scanner — insanely fast!', 'Textbook performance. Blazing!',
      'Pilot-grade speed. Take a bow.', 'Is that a hand or a turbocharger?',
      'So fast the numbers never saw you coming.', 'Flawless — speed personified.',
      'Rivals would retire after seeing this.', 'Are you secretly using cheats?',
      'Fast and steady. The pros are calling.', 'A flawless run. Ten out of ten!',
    ],
    B: [
      'Very good — one step from elite.', 'Solid. A few more rounds and you\'ll shine.',
      'Nice pace! Keep pushing.', 'Great run! So close to top tier.',
      'Your focus is clearly improving.', 'Almost A-grade. Give it one more push.',
      'Clean and quick. Impressive.', 'Above average — keep it up!',
      'Well done! Trending upward.', 'Nice flow! Sharpen it a little more.',
    ],
    C: [
      'Meh… is that a speed or a stroll?', 'Passed, but barely. Not impressive.',
      'Your hand arrived; your brain is still on its way.', 'That\'s it? The numbers got bored waiting.',
      'Slow enough for a turtle to cheer you on.', 'Are you tapping with mittens on?',
      'Coasting on the edge of "okay".', 'Found the numbers by luck, did we?',
      'Such speed, much wow… not really.', 'Efficiency: call it generous.',
    ],
    D: [
      'A snail would overtake you soon.', 'Playing and doom-scrolling at once?',
      'Did you tap a sloth instead of a button?', 'Random taps might be faster.',
      'Too slow. Were you up all night?', 'Three number rounds passed before you found one.',
      'Even ants move with more purpose.', 'This pace belongs in a bank queue.',
      'Slow to the point of looking frozen.', 'Slow fingers, and denial to match.',
    ],
    E: [
      'Slow with remarkable consistency — a talent indeed.', 'Did you nap halfway through?',
      'Your grandma flips recipe pages faster.', 'That was slow-motion footage, not training.',
      'Both hands and eyes slow. Impressive combo.', 'Others finished while you hunted for "7".',
      'Hide this score. Seriously.', 'You are the poster child for slow hands.',
      'The digits sweated watching you.', 'My router reboots faster than you tap.',
    ],
    F: [
      'Stop, sleep, and try again. The numbers beg you.', 'Start over from 3×3, gently.',
      'Post this score and get roasted for a year.', 'Are you tapping with your toes?',
      'So slow the Earth paused to wait.', 'This is slow beyond human limits. Unique!',
      'The numbers bloomed, wilted, and died waiting.', 'Were you tapping in your sleep?',
      'My grandma laps you ten times over.', 'Slow hands, slower excuses. Rest up.',
    ],
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ============================================================
   * i18n：界面语言（默认英语）
   * ============================================================ */
  const LANGS = ['en', 'zh'];
  const LANG_NAMES = {
    en: 'English', zh: '简体中文', es: 'Español', ja: '日本語', ko: '한국어',
  };

  const I18N = {
    en: {
      'login.sub': 'Attention · Visual Search · Reaction Speed',
      'login.name': 'Nickname',
      'login.placeholder': 'Enter your name',
      'login.hint': 'First name auto-registers. This device will sign you in automatically next time.',
      'login.enter': 'Start Training',
      'login.busy': 'Please wait…',
      'app.title': 'Schulte Trainer',
      'side.title': 'Training Options',
      'side.spec': 'Grid Size',
      'side.start': 'Start Training',
      'side.running': 'Training…',
      'side.rule': 'After starting, tap 1 → 2 → 3 … in order. Timing begins when you press 1.',
      'hud.time': 'Time', 'hud.progress': 'Progress', 'hud.last': 'Last Round', 'hud.giveUp': 'Give Up',
      'wait.hint': 'Tap 1 to start timing',
      'done.title': 'Finished!',
      'done.again': 'Play Again', 'done.finish': 'Done',
      'done.size': 'Size {size} · 1 - {total} in order',
      'hist.title': 'History',
      'hist.all': 'All',
      'hist.list': 'Record List', 'hist.chart': 'Chart',
      'hist.rangeToday': 'Today', 'hist.range7': 'Last Week', 'hist.range30': 'Last Month', 'hist.range90': 'Last 3 Months', 'hist.range365': 'Last Year',
      'hist.clear': 'Clear Records', 'hist.clearAll': 'Clear All Records', 'hist.clearMode': 'Clear {size} Records',
      'hist.empty1': 'No records yet. Complete a round and it will be saved here.',
      'hist.none': 'No records in the current range.',
      'hist.loading': 'Loading…',
      'hist.errOld': 'Cannot load history: the server may be an old version. Restart start.bat and refresh.',
      'chart.metaDaily': '{range} ({spec}): {n} rounds · {d} days · Best {best}s · Avg {avg}s · Worst {worst}s',
      'chart.metaToday': 'Today ({spec}): {n} rounds · Avg {avg}s · Fastest {best}s',
      'chart.empty': 'No records in this time range yet.',
      'chart.best': 'Daily Best', 'chart.avg': 'Daily Average', 'chart.worst': 'Daily Worst',
      'chart.attempt': 'Each Round', 'chart.avgRef': 'Average',
      'chart.th': '{n}th', 'chart.modeOf': '{time} ({spec}): {s}s', 'chart.point': '{label}: {s}s\n{date} ({spec})',
      'settings.title': 'Settings',
      'settings.theme': 'Appearance', 'settings.theme.light': 'Light', 'settings.theme.dark': 'Dark', 'settings.theme.auto': 'Auto',
      'settings.size': 'Number Size',
      'settings.font': 'Number Font',
      'settings.reset': 'Reset Defaults',
      'settings.saving': 'Saving…',
      'settings.saved': 'Saved (tied to your name; applies on any device)',
      'settings.fail': 'Save failed. Check the server and retry.',
      'font.default': 'Default', 'font.yahei': 'Microsoft YaHei', 'font.simsun': 'SimSun', 'font.kaiti': 'KaiTi', 'font.heiti': 'SimHei', 'font.pingfang': 'PingFang / System',
      'settings.lang': 'Language',
      'hello': '<b>{name}</b>, pick a grid size and press Start.',
      'unit.sec': 's',
      'hist.summary': 'Total <b>{n}</b> rounds · Best <b>{best}s</b> (Grade <b>{grade}</b> · {mode})',
      'login.auto': 'Signing you in as {name}…',
      'login.errEmpty': 'Enter a name first.',
      'login.errFail': 'Login failed. Please retry.',
      'hist.errClear': 'Clear failed. Please retry.',
      'menu.switch': 'Switch User',
      'users.title': 'Registered Users',
      'users.empty': 'No users yet. Enter a name above to register.',
      'users.delConfirm': 'Delete user "{name}" and all their records & settings? This cannot be undone.',
      'users.delDone': 'User deleted.',
    },
    zh: {
      'login.sub': '注意力 · 视觉搜索 · 反应速度',
      'login.name': '昵称',
      'login.placeholder': '输入你的名字',
      'login.hint': '首次输入名字会自动注册；同一台设备下次访问将自动登录。',
      'login.enter': '进入训练',
      'login.busy': '请稍候…',
      'app.title': '舒尔特方格',
      'side.title': '训练选项',
      'side.spec': '方格规格',
      'side.start': '开始训练',
      'side.running': '训练中…',
      'side.rule': '开始后请按 1 → 2 → 3 … 的顺序点击；从按下 1 起计时。',
      'hud.time': '用时', 'hud.progress': '进度', 'hud.last': '上一轮', 'hud.giveUp': '放弃本轮',
      'wait.hint': '点击 1 开始计时',
      'done.title': '全部找完！',
      'done.again': '再来一次', 'done.finish': '完成',
      'done.size': '规格 {size} · 按顺序找完 1 - {total}',
      'hist.title': '历史成绩',
      'hist.all': '全部',
      'hist.list': '记录列表', 'hist.chart': '折线图',
      'hist.rangeToday': '今天', 'hist.range7': '近一周', 'hist.range30': '近一月', 'hist.range90': '近三月', 'hist.range365': '近一年',
      'hist.clear': '清空我的记录', 'hist.clearAll': '清空全部记录', 'hist.clearMode': '清空 {size} 记录',
      'hist.empty1': '还没有记录，完成一局后会自动保存到这里。',
      'hist.none': '当前所选范围内还没有记录。',
      'hist.loading': '加载中…',
      'hist.errOld': '无法读取历史：服务器可能是旧版本。请关闭黑窗后重新双击 start.bat，再刷新页面。',
      'chart.metaDaily': '{range}（{spec}）：共 {n} 局 · 覆盖 {d} 天 · 最佳 {best} 秒 · 平均 {avg} 秒 · 最差 {worst} 秒',
      'chart.metaToday': '今天（{spec}）：共 {n} 局 · 平均 {avg} 秒 · 最快 {best} 秒',
      'chart.empty': '当前时间范围暂无记录，完成一局后会出现在这里。',
      'chart.best': '当日最佳', 'chart.avg': '当日平均', 'chart.worst': '当日最差',
      'chart.attempt': '每次成绩', 'chart.avgRef': '平均',
      'chart.th': '第{n}次', 'chart.modeOf': '{time} {label}：{s} 秒', 'chart.point': '{label}：{s} 秒\n{date}（{spec}）',
      'settings.title': '设置',
      'settings.theme': '界面主题', 'settings.theme.light': '白色', 'settings.theme.dark': '深色', 'settings.theme.auto': '跟随系统',
      'settings.size': '数字大小',
      'settings.font': '数字字体',
      'settings.reset': '恢复默认',
      'settings.saving': '保存中…',
      'settings.saved': '已保存（按用户名保存，换设备登录同名自动生效）',
      'settings.fail': '保存失败，请检查服务后重试',
      'font.default': '默认', 'font.yahei': '微软雅黑', 'font.simsun': '宋体', 'font.kaiti': '楷体', 'font.heiti': '黑体', 'font.pingfang': '苹方 / 系统',
      'settings.lang': '语言',
      'hello': '{greet}，<b>{name}</b>，选好规格点“开始训练”即可。',
      'unit.sec': '秒',
      'hist.summary': '共 <b>{n}</b> 局 · 当前最佳 <b>{best} 秒</b>（等级 <b>{grade}</b> · {mode}）',
      'login.auto': '正在自动登录 {name} …',
      'login.errEmpty': '请输入名字后再进入训练',
      'login.errFail': '登录失败，请重试',
      'hist.errClear': '清空失败，请稍后重试。',
      'menu.switch': '切换用户',
      'users.title': '已注册用户',
      'users.empty': '暂无用户，输入名字注册后显示在这里。',
      'users.delConfirm': '确定删除用户「{name}」及其全部成绩与设置吗？此操作不可恢复。',
      'users.delDone': '用户已删除。',
    },
    es: {
      'login.enter': 'Iniciar', 'login.name': 'Nombre', 'login.placeholder': 'Escribe tu nombre',
      'side.start': 'Iniciar', 'side.running': 'Entrenando…', 'side.spec': 'Tamaño de cuadrícula',
      'hud.time': 'Tiempo', 'hud.progress': 'Progreso', 'hud.last': 'Anterior', 'hud.giveUp': 'Abandonar',
      'wait.hint': 'Pulsa 1 para iniciar',
      'done.again': 'Repetir', 'done.finish': 'Listo',
      'hist.title': 'Historial', 'hist.all': 'Todos',
      'hist.list': 'Lista', 'hist.chart': 'Gráfica',
      'hist.rangeToday': 'Hoy', 'hist.range7': '1 semana', 'hist.range30': '1 mes', 'hist.range90': '3 meses', 'hist.range365': '1 año',
      'settings.title': 'Ajustes', 'settings.theme': 'Apariencia',
      'settings.theme.light': 'Claro', 'settings.theme.dark': 'Oscuro', 'settings.theme.auto': 'Auto',
      'settings.size': 'Tamaño de número', 'settings.lang': 'Idioma', 'settings.reset': 'Restablecer',
    },
    ja: {
      'login.enter': '開始', 'login.name': '名前', 'login.placeholder': '名前を入力',
      'side.start': '開始', 'side.running': 'トレーニング中…', 'side.spec': 'グリッドサイズ',
      'hud.time': '時間', 'hud.progress': '進捗', 'hud.last': '前回', 'hud.giveUp': '中断',
      'wait.hint': '1 を押して計測開始',
      'done.again': 'もう一度', 'done.finish': '完了',
      'hist.title': '履歴', 'hist.all': 'すべて',
      'hist.list': '一覧', 'hist.chart': 'グラフ',
      'hist.rangeToday': '今日', 'hist.range7': '1週間', 'hist.range30': '1ヶ月', 'hist.range90': '3ヶ月', 'hist.range365': '1年',
      'settings.title': '設定', 'settings.theme': '外観',
      'settings.theme.light': 'ライト', 'settings.theme.dark': 'ダーク', 'settings.theme.auto': '自動',
      'settings.size': '数字のサイズ', 'settings.lang': '言語', 'settings.reset': 'リセット',
    },
    ko: {
      'login.enter': '시작', 'login.name': '이름', 'login.placeholder': '이름 입력',
      'side.start': '시작', 'side.running': '훈련 중…', 'side.spec': '격자 크기',
      'hud.time': '시간', 'hud.progress': '진행', 'hud.last': '이전', 'hud.giveUp': '포기',
      'wait.hint': '1을 눌러 시작',
      'done.again': '다시 하기', 'done.finish': '완료',
      'hist.title': '기록', 'hist.all': '전체',
      'hist.list': '목록', 'hist.chart': '차트',
      'hist.rangeToday': '오늘', 'hist.range7': '1주', 'hist.range30': '1개월', 'hist.range90': '3개월', 'hist.range365': '1년',
      'settings.title': '설정', 'settings.theme': '테마',
      'settings.theme.light': '라이트', 'settings.theme.dark': '다크', 'settings.theme.auto': '자동',
      'settings.size': '숫자 크기', 'settings.lang': '언어', 'settings.reset': '기본값 복원',
    },
  };

  function lang() {
    return LANGS.includes(state.settings.language) ? state.settings.language : 'en';
  }

  function t(key, vars) {
    const dict = I18N[lang()] || {};
    let s = dict[key] !== undefined ? dict[key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return s;
  }

  /* 折线图用：三条统计线的颜色 */
  const STAT_LINES = [
    { key: 'best', label: '当日最佳', color: '#0f7b0f' },
    { key: 'avg', label: '当日平均', color: '#0067c0' },
    { key: 'worst', label: '当日最差', color: '#c42b1c' },
  ];
  const RANGE_DAYS = { 7: 7, 30: 30, 90: 90, 365: 365 };

  /* ---------- 状态 ---------- */
  const state = {
    user: null,
    size: 5,
    total: 25,
    next: 1,        // 下一个要找的数字
    running: false, // 数字已揭示、可点击
    timingStarted: false, // 是否已按下 1（从此刻才开始计时）
    t0: 0,          // 计时开始时间戳（performance.now）
    raf: 0,         // 计时动画帧 id
    last: null,     // 上一轮用时（秒，仅本次运行内存）
    sbCollapsed: false,   // 侧栏折叠偏好
    sbRaf: 0,             // 开合动画期间字号同步帧
    sbAnimToken: 0,       // 开合动画序号（用于取消过期同步）
    swapTimer: 0,         // 规格切换动画计时器
    histFilter: 'all',    // 历史成绩筛选：all | NxN
    histData: null,       // 历史成绩缓存
    histView: 'list',     // 历史视图：list | chart
    histRange: '30',      // 折线图时间范围(天)：today | 7 | 30 | 90 | 365
    histCloseTimer: 0,    // 历史弹窗关闭动画计时器
    settingsCloseTimer: 0, // 设置弹窗关闭动画计时器
    settings: { theme: 'auto', fontSize: 1, font: 'default', language: 'en' }, // 用户设置
    loginLangChosen: false, // 登录页是否手动选择过语言
  };

  /* ---------- DOM ---------- */
  const els = {
    loginView: $('#login-view'),
    mainView: $('#main-view'),
    loginForm: $('#login-form'),
    nameInput: $('#name-input'),
    loginBtn: $('#login-btn'),
    loginHint: $('#login-hint'),
    loginLang: $('#login-lang'),
    loginUserList: $('#login-user-list'),
    hello: $('#hello'),
    sidebar: $('#sidebar'),
    sidebarToggle: $('#sidebar-toggle'),
    seg: $('#size-seg'),
    startBtn: $('#start-btn'),
    startBtnMobile: $('#start-btn-mobile'),
    timer: $('#timer'),
    progress: $('#progress'),
    lastTime: $('#last-time'),
    resetLink: $('#reset-link'),
    board: $('#board'),
    boardCard: $('#board-card'),
    waitHint: $('#wait-hint'),
    userMenu: $('#user-menu'),
    userChip: $('#user-chip'),
    userAvatar: $('#user-avatar'),
    userChipName: $('#user-chip-name'),
    menuAvatar: $('#menu-avatar'),
    menuName: $('#menu-name'),
    switchBtn: $('#switch-btn'),
    doneOverlay: $('#done-overlay'),
    doneDialog: $('#done-dialog'),
    gradeLetter: $('#grade-letter'),
    doneSlogan: $('#done-slogan'),
    doneSize: $('#done-size'),
    doneTime: $('#done-time'),
    againBtn: $('#again-btn'),
    backBtn: $('#back-btn'),
    historyBtn: $('#history-btn'),
    historyOverlay: $('#history-overlay'),
    historyClose: $('#history-close'),
    historySummary: $('#history-summary'),
    historyView: $('#history-view'),
    historyModes: $('#history-modes'),
    historyList: $('#history-list'),
    historyClear: $('#history-clear'),
    chartPanel: $('#chart-panel'),
    chartRanges: $('#chart-ranges'),
    chartMeta: $('#chart-meta'),
    chartBox: $('#chart-box'),
    chartLegend: $('#chart-legend'),
    settingsBtn: $('#settings-btn'),
    settingsOverlay: $('#settings-overlay'),
    settingsClose: $('#settings-close'),
    setTheme: $('#set-theme'),
    setFontsize: $('#set-fontsize'),
    setFontsizeVal: $('#set-fontsize-val'),
    setFont: $('#set-font'),
    setFontSample: $('#set-font-sample'),
    setStatus: $('#settings-status'),
    settingsReset: $('#settings-reset'),
    setLang: $('#set-lang'),
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;
  const fmtTime = (sec) => `${sec.toFixed(2)} ${t('unit.sec')}`;

  function readSidebarPref() {
    try {
      const raw = localStorage.getItem(SIDEBAR_KEY);
      if (raw === 'true' || raw === 'false') return raw === 'true';
    } catch {
      /* ignore */
    }
    return null;
  }

  let lastMobile = isMobile();

  /* ============================================================
   * 左侧栏 折叠 / 展开
   * ============================================================ */
  function applySbCollapsed(collapsed) {
    const wasCollapsed = document.body.classList.contains('sb-collapsed');
    if (wasCollapsed === collapsed) {
      els.sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
      return;
    }
    els.sidebarToggle.setAttribute('aria-expanded', String(!collapsed));

    // 登录页未显示时只切状态，不做动画
    if (els.mainView.classList.contains('hidden')) {
      document.body.classList.toggle('sb-collapsed', collapsed);
      return;
    }

    document.body.classList.add('sb-anim'); // 动画期间临时关闭毛玻璃，保证流畅
    document.body.classList.toggle('sb-collapsed', collapsed);

    // 开合期间逐帧同步方格字号，避免“动画结束才突然跳一下”的台阶感
    const token = ++state.sbAnimToken;
    const end = performance.now() + 460;
    (function syncLoop() {
      if (token !== state.sbAnimToken) return; // 已被新一次开合取代
      sizeCells();
      if (performance.now() < end) {
        state.sbRaf = requestAnimationFrame(syncLoop);
      } else {
        sizeCells();
        document.body.classList.remove('sb-anim');
      }
    })();
  }

  function toggleSidebar(persist) {
    state.sbCollapsed = !document.body.classList.contains('sb-collapsed');
    applySbCollapsed(state.sbCollapsed);
    if (persist) {
      try {
        localStorage.setItem(SIDEBAR_KEY, String(state.sbCollapsed));
      } catch {
        /* ignore */
      }
    }
  }

  /* 训练开始时自动收起侧栏（不改变用户偏好） */
  function autoCollapse() {
    if (!document.body.classList.contains('sb-collapsed')) {
      applySbCollapsed(true);
    }
  }

  /* ============================================================
   * API
   * ============================================================ */
  async function apiLogin(name) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return { httpOk: res.ok, data };
  }

  /* 保存一条完成记录（后台静默提交，失败不打扰训练） */
  function apiSaveRecord(payload) {
    fetch('/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  /* 查询历史记录（按规格分组：{ '3x3': [...], ... }） */
  async function apiGetRecords(name) {
    try {
      const res = await fetch('/api/records?name=' + encodeURIComponent(name));
      const data = await res.json();
      return data && data.ok ? data.records : {};
    } catch {
      return null;
    }
  }

  /* ---------- 已注册用户列表 / 删除 ---------- */
  async function apiGetUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      return data && data.ok ? data.users : [];
    } catch {
      return null;
    }
  }

  async function apiDeleteUser(name) {
    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      return !!(data && data.ok);
    } catch {
      return false;
    }
  }

  async function apiClearRecords(name, size) {    try {
      const body = { name };
      if (size) body.size = size;
      const res = await fetch('/api/records/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return !!(data && data.ok);
    } catch {
      return false;
    }
  }

  /* ---------- 用户设置 ---------- */
  async function apiGetSettings(name) {
    try {
      const res = await fetch('/api/settings?name=' + encodeURIComponent(name));
      const data = await res.json();
      return data && data.ok ? data.settings : null;
    } catch {
      return null;
    }
  }

  async function apiSaveSettings(name, settings) {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, settings }),
      });
      const data = await res.json();
      return data && data.ok ? data.settings : null;
    } catch {
      return null;
    }
  }

  /* ============================================================
   * 用户设置：主题 / 数字大小 / 字体（随用户保存，跨设备生效）
   * ============================================================ */
  const FONT_OPTIONS = [
    { key: 'default', label: '默认' },
    { key: 'yahei', label: '微软雅黑' },
    { key: 'simsun', label: '宋体' },
    { key: 'kaiti', label: '楷体' },
    { key: 'heiti', label: '黑体' },
    { key: 'pingfang', label: '苹方 / 系统' },
  ];
  const FONT_STACKS = {
    default: ['"Segoe UI Variable Text"', '"Segoe UI"', '"Microsoft YaHei UI"', '"Microsoft YaHei"', 'system-ui', '-apple-system', '"PingFang SC"', 'sans-serif'].join(', '),
    yahei: ['"Microsoft YaHei UI"', '"Microsoft YaHei"', '"Segoe UI"', 'system-ui', 'sans-serif'].join(', '),
    simsun: ['"NSimSun"', '"SimSun"', '"宋体"', 'serif'].join(', '),
    kaiti: ['"KaiTi"', '"楷体"', '"STKaiti"', '"AR PL UKai CN"', 'serif'].join(', '),
    heiti: ['"SimHei"', '"黑体"', '"Heiti SC"', 'system-ui', 'sans-serif'].join(', '),
    pingfang: ['"PingFang SC"', '"HarmonyOS Sans SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'].join(', '),
  };
  const DARK_MEDIA = window.matchMedia('(prefers-color-scheme: dark)');

  /* ---------- 登录页语言 ---------- */
  function readLangPref() {
    try {
      const v = localStorage.getItem(LANG_PREF_KEY);
      return LANGS.includes(v) ? v : null;
    } catch {
      return null;
    }
  }

  function writeLangPref(v) {
    try {
      localStorage.setItem(LANG_PREF_KEY, v);
    } catch {
      /* ignore */
    }
  }

  function syncLoginLangActive() {
    if (!els.loginLang) return;
    els.loginLang.querySelectorAll('.seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.setLang === state.settings.language)
    );
  }

  function buildLoginLang() {
    if (!els.loginLang) return;
    els.loginLang.innerHTML = '';
    LANGS.forEach((code) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn' + (code === state.settings.language ? ' active' : '');
      b.dataset.setLang = code;
      b.textContent = LANG_NAMES[code];
      b.addEventListener('click', () => {
        state.settings.language = code;
        state.loginLangChosen = true;
        writeLangPref(code);
        applyLanguageUI();
        syncLoginLangActive();
      });
      els.loginLang.appendChild(b);
    });
  }

  /* 显示登录页时：应用本机记住的语言（未登录也能选语言注册） */
  function applyLoginPageLang() {
    const pref = readLangPref();
    if (pref) state.settings.language = pref;
    applyLanguageUI();
    syncLoginLangActive();
  }

  function cssVar(name, fb) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  }

  function setSettingsStatus(text) {
    els.setStatus.textContent = text;
  }

  function resolveDark() {
    return state.settings.theme === 'dark' || (state.settings.theme === 'auto' && DARK_MEDIA.matches);
  }

  function applySettingsVisuals() {
    // 主题
    document.body.setAttribute('data-theme', resolveDark() ? 'dark' : 'light');
    // 字体
    const stack = FONT_STACKS[state.settings.font] || FONT_STACKS.default;
    const root = document.documentElement.style;
    root.setProperty('--font', stack);
    root.setProperty('--font-display', stack);
    // 预览格
    if (els.setFontSample) {
      els.setFontSample.style.fontFamily = stack;
      els.setFontSample.style.fontSize = `${Math.round(state.settings.fontSize * 24)}px`;
    }
    // 字号同步到当前格子
    if (!els.mainView.classList.contains('hidden')) sizeCells();
  }

  function syncSettingsControls() {
    els.setTheme.querySelectorAll('.seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.setTheme === state.settings.theme)
    );
    els.setFontsize.value = String(Math.round(state.settings.fontSize * 100));
    els.setFontsizeVal.textContent = `${els.setFontsize.value}%`;
    els.setFont.value = state.settings.font;
  }

  function buildSettingsUi() {
    // 清空后重建（语言切换时会重调本函数）
    els.setLang.innerHTML = '';
    els.setTheme.innerHTML = '';
    els.setFont.innerHTML = '';

    // 语言
    LANGS.forEach((code) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn' + (state.settings.language === code ? ' active' : '');
      b.dataset.setLang = code;
      b.textContent = LANG_NAMES[code];
      b.addEventListener('click', () => {
        state.settings.language = code;
        applyLanguageUI();
        syncSettingsControls();
        persistSettings();
      });
      els.setLang.appendChild(b);
    });

    // 主题分段
    [
      { key: 'light', label: 'settings.theme.light' },
      { key: 'dark', label: 'settings.theme.dark' },
      { key: 'auto', label: 'settings.theme.auto' },
    ].forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn';
      b.dataset.setTheme = o.key;
      b.textContent = t(o.label);
      b.addEventListener('click', () => {
        state.settings.theme = o.key;
        applySettingsVisuals();
        syncSettingsControls();
        persistSettings();
      });
      els.setTheme.appendChild(b);
    });

    // 字体下拉
    FONT_OPTIONS.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.key;
      opt.textContent = t('font.' + o.key);
      els.setFont.appendChild(opt);
    });
    els.setFont.addEventListener('change', () => {
      state.settings.font = els.setFont.value;
      applySettingsVisuals();
      syncSettingsControls();
      persistSettings();
    });

    // 字号滑杆与恢复默认：只在首次构建时绑定一次
    if (!baseSettingsBound) {
      baseSettingsBound = true;
      els.setFontsize.addEventListener('input', () => {
        state.settings.fontSize = Number(els.setFontsize.value) / 100;
        els.setFontsizeVal.textContent = `${els.setFontsize.value}%`;
        applySettingsVisuals();
      });
      els.setFontsize.addEventListener('change', persistSettings);
      els.settingsReset.addEventListener('click', async () => {
        state.settings = { theme: 'auto', fontSize: 1, font: 'default', language: 'en' };
        applySettingsVisuals();
        applyLanguageUI();
        syncSettingsControls();
        await persistSettings();
      });
    }
  }

  /* 语言切换后刷新所有文案与动态控件 */
  function applyLanguageUI() {
    document.documentElement.lang = lang() === 'zh' ? 'zh-CN' : lang();
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    if (els.nameInput) els.nameInput.placeholder = t('login.placeholder');
    // 问候语
    if (state.user) {
      const hour = new Date().getHours();
      const greet = lang() === 'zh'
        ? (hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好')
        : '';
      els.hello.innerHTML = t('hello', { name: escapeHtml(state.user), greet });
    }
    // 开始按钮状态文字
    setStartButtons(state.running);
    if (!els.loginBtn.disabled) els.loginBtn.textContent = t('login.enter');
    // 重建带标签的动态控件
    els.historyModes.innerHTML = '';
    buildModeChips();
    els.historyView.innerHTML = '';
    buildViewSwitch();
    els.chartRanges.innerHTML = '';
    buildRangeChips();
    els.setLang.innerHTML = '';
    els.setTheme.innerHTML = '';
    els.setFont.innerHTML = '';
    buildSettingsUi();
    syncSettingsControls();
    syncLoginLangActive();
    // 若弹窗开着即时刷新
    if (!els.historyOverlay.classList.contains('hidden')) refreshHistoryView();
  }

  async function persistSettings() {
    if (!state.user) return;
    setSettingsStatus(t('settings.saving'));
    const resp = await apiSaveSettings(state.user, state.settings);
    if (resp) {
      state.settings = resp;
      applySettingsVisuals();
      syncSettingsControls();
      setSettingsStatus(t('settings.saved'));
    } else {
      setSettingsStatus(t('settings.fail'));
    }
  }

  function openSettings() {
    clearTimeout(state.settingsCloseTimer);
    els.settingsOverlay.classList.remove('settings-closing');
    els.settingsOverlay.classList.remove('hidden');
    syncSettingsControls();
  }

  function closeSettings() {
    const ov = els.settingsOverlay;
    if (ov.classList.contains('hidden')) return;
    ov.classList.add('settings-closing'); // 播放 iOS 风格关闭动画后隐藏
    clearTimeout(state.settingsCloseTimer);
    state.settingsCloseTimer = setTimeout(() => {
      ov.classList.add('hidden');
      ov.classList.remove('settings-closing');
    }, 320);
  }

  function loadUserSettings(name) {
    return apiGetSettings(name).then((s) => {
      if (s) state.settings = { theme: 'auto', fontSize: 1, font: 'default', language: 'en', ...s };
      applySettingsVisuals();
      applyLanguageUI();
    });
  }

  /* 跟随系统：系统深浅切换时自动响应 */
  DARK_MEDIA.addEventListener('change', () => {
    if (state.settings.theme === 'auto') applySettingsVisuals();
  });

  /* ============================================================
   * 登录 / 退出
   * ============================================================ */
  function setHint(text, kind = '') {
    els.loginHint.textContent = text;
    els.loginHint.className = 'login-hint' + (kind ? ' ' + kind : '');
  }

  function setLoginBusy(busy) {
    els.loginBtn.disabled = busy;
    els.loginBtn.textContent = busy ? t('login.busy') : t('login.enter');
  }

  /* 渲染“已注册用户”列表并支持删除 */
  async function refreshLoginUsers() {
    if (!els.loginUserList) return;
    const list = await apiGetUsers();
    if (!Array.isArray(list)) return;
    const box = els.loginUserList;
    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = `<div class="lu-empty">${t('users.empty')}</div>`;
      return;
    }
    list.forEach((u) => {
      const row = document.createElement('div');
      row.className = 'lu-row';
      const name = document.createElement('span');
      name.className = 'lu-name';
      name.textContent = u.name;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'lu-del';
      del.setAttribute('aria-label', t('users.delConfirm', { name: u.name }));
      del.innerHTML = '<svg viewBox="0 0 20 20" width="15" height="15"><path fill="currentColor" d="M7 3h6l1 1h3v1H3V4h3l1-1zm-2 3h10l-.8 11H5.8L5 6z"/></svg>';
      del.addEventListener('click', async () => {
        const msg = t('users.delConfirm', { name: u.name });
        if (!window.confirm(msg)) return;
        const ok = await apiDeleteUser(u.name);
        if (!ok) {
          setHint(t('hist.errClear'), 'error');
          return;
        }
        // 若删除的正是本机自动登录用户，清除本地记忆
        try {
          if (localStorage.getItem(STORE_KEY) === u.name) localStorage.removeItem(STORE_KEY);
        } catch { /* ignore */ }
        await refreshLoginUsers();
      });
      row.append(name, del);
      box.appendChild(row);
    });
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const name = els.nameInput.value.trim().replace(/\s+/g, ' ');
    if (!name) {
      setHint(t('login.errEmpty'), 'error');
      els.nameInput.focus();
      return;
    }
    setLoginBusy(true);
    setHint('…');
    try {
      const { httpOk, data } = await apiLogin(name);
      if (httpOk && data.ok) {
        enterApp(name, !!data.isNew);
      } else {
        setHint(t('login.errFail'), 'error');
      }
    } catch {
      // 网络异常时允许离线继续（静态页面已加载）
      enterApp(name, false);
    } finally {
      setLoginBusy(false);
    }
  }

  async function enterApp(name, isNew) {
    state.user = name;
    try {
      localStorage.setItem(STORE_KEY, name);
    } catch {
      /* 隐私模式下忽略 */
    }
    els.loginView.classList.add('hidden');
    els.mainView.classList.remove('hidden');
    updateUserChip();
    // 进入后按偏好展开侧栏（移动端默认收起为抽屉）
    applySbCollapsed(state.sbCollapsed);
    // 登录页选择过语言：新注册时随账号保存（老用户则更新为其所选语言）
    const chosenLang = state.loginLangChosen ? state.settings.language : null;
    // 拉取该用户保存的设置（主题/字号/字体/语言），跨设备同步
    await loadUserSettings(name);
    if (chosenLang) {
      state.settings.language = chosenLang;
      applySettingsVisuals();
      applyLanguageUI();
      syncLoginLangActive();
      try {
        await apiSaveSettings(name, state.settings);
      } catch {
        /* 静默 */
      }
      state.loginLangChosen = false;
    }
    resetToIdle();
  }

  function doLogout() {
    if (state.running) stopTiming(false);
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
    state.user = null;
    // 退出后回到默认外观；登录页语言按本机偏好显示
    state.settings = { theme: 'auto', fontSize: 1, font: 'default', language: 'en' };
    state.loginLangChosen = false;
    applySettingsVisuals();
    applyLoginPageLang();
    els.mainView.classList.add('hidden');
    els.loginView.classList.remove('hidden');
    els.loginForm.reset();
    setHint(t('login.hint'));
    refreshLoginUsers();
    els.nameInput.focus();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function updateUserChip() {
    const name = state.user || '';
    const initial = [...name][0] || '?';
    els.userAvatar.textContent = initial;
    els.userChipName.textContent = name;
    els.menuAvatar.textContent = initial;
    els.menuName.textContent = name;
  }

  function toggleMenu(open) {
    const willOpen = open === undefined ? !els.userMenu.classList.contains('open') : open;
    els.userMenu.classList.toggle('open', willOpen);
    els.userChip.setAttribute('aria-expanded', String(willOpen));
  }

  /* ============================================================
   * 方格渲染
   * ============================================================ */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildBoard(n) {
    state.size = n;
    state.total = n * n;
    state.next = 1;
    els.board.innerHTML = '';
    els.board.appendChild(els.waitHint); // 提示放在方格容器内但脱离网格流，清空后要放回
    els.board.classList.remove('revealed');
    els.board.classList.remove('waiting1');
    els.board.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    els.board.style.gridTemplateRows = `repeat(${n}, 1fr)`;
    els.board.style.gap = `${n >= 7 ? 5 : n >= 6 ? 6 : 8}px`;

    const order = shuffle(Array.from({ length: state.total }, (_, i) => i + 1));
    order.forEach((value, i) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.v = String(value);
      cell.style.setProperty('--i', i);
      cell.style.setProperty('--row', Math.floor(i / n));
      cell.setAttribute('aria-label', `数字 ${value}`);
      // 数字包一层 span，便于“按错时数字左右晃动”
      const num = document.createElement('span');
      num.className = 'cell-num';
      num.textContent = String(value);
      cell.appendChild(num);
      cell.addEventListener('click', () => onCellClick(cell));
      els.board.appendChild(cell);
    });

    els.timer.textContent = fmtTime(0);
    els.timer.classList.remove('running');
    els.progress.textContent = `0 / ${state.total}`;
    sizeCells();
  }

  /* 根据格子大小自适应字号（受用户“数字大小”设置影响） */
  function sizeCells() {
    if (els.mainView.classList.contains('hidden')) return;
    const width = els.board.clientWidth;
    if (!width) return;
    const scale = state.settings.fontSize || 1;
    const fs = clamp((width / state.size) * 0.46 * scale, 11, 130);
    els.board.style.setProperty('--cell-fs', `${fs}px`);
    if (!els.waitHint.classList.contains('hidden')) placeWaitHint();
  }

  /* 把“点击 1 开始计时”提示定位到数字 1 的上方（顶部放不下则放下方） */
  function placeWaitHint() {
    const c1 = els.board.querySelector('.cell[data-v="1"]');
    if (!c1) return;
    const boardRect = els.board.getBoundingClientRect();
    const cRect = c1.getBoundingClientRect();
    const hintH = els.waitHint.offsetHeight || 32;
    const centerX = cRect.left + cRect.width / 2 - boardRect.left;
    let top = cRect.top - boardRect.top - hintH - 6;
    if (top < 0) top = cRect.bottom - boardRect.top + 6; // 第一行时放 1 的下方
    els.waitHint.style.left = `${centerX}px`;
    els.waitHint.style.top = `${top}px`;
  }

  function showWaitHint() {
    els.waitHint.classList.remove('hidden');
    els.waitHint.classList.add('pulse');
    requestAnimationFrame(() => placeWaitHint());
  }

  function hideWaitHint() {
    els.waitHint.classList.add('hidden');
    els.waitHint.classList.remove('pulse');
  }

  /* 规格切换动画：旧盘逐行淡出后重建，新盘从上到下逐行淡入 */
  function animateSizeSwitch(n) {
    clearTimeout(state.swapTimer);
    const b = els.board;
    b.classList.remove('board-swap-in');
    void b.offsetWidth; // 重启动画
    b.classList.add('board-swap-out');
    state.swapTimer = setTimeout(() => {
      buildBoard(n);
      b.classList.remove('board-swap-out');
      b.classList.add('board-swap-in');
      state.swapTimer = setTimeout(() => b.classList.remove('board-swap-in'), 460);
    }, 200);
  }

  function onCellClick(cell) {
    if (!state.running) return;
    const v = Number(cell.dataset.v);
    if (v === state.next) {
      // 按下 1 时：亮出全部数字并开始计时
      if (!state.timingStarted) {
        state.timingStarted = true;
        state.t0 = performance.now();
        els.board.classList.remove('waiting1');
        els.board.classList.add('revealed'); // 其余数字随 pop 动画亮出
        hideWaitHint();
        els.timer.classList.add('running');
        state.raf = requestAnimationFrame(tick);
      }
      // 当前点对的数字：蓝框高亮；前一个自动恢复普通样式
      const prev = els.board.querySelector('.cell.done');
      if (prev && prev !== cell) prev.classList.remove('done');
      cell.classList.add('done');
      cell.dataset.used = '1'; // 仅用于“再点旧格子”时的短暂提醒
      state.next += 1;
      els.progress.textContent = `${state.next - 1} / ${state.total}`;
      if (state.next > state.total) finishRound();
    } else if (cell.dataset.used === '1') {
      // 已找过的数字被再次点击：琥珀色反馈（与点错的红/灰区分）
      cell.classList.remove('retap');
      void cell.offsetWidth;
      cell.classList.add('retap');
      setTimeout(() => cell.classList.remove('retap'), 520);
      if (navigator.vibrate) navigator.vibrate(40);
    } else {
      cell.classList.remove('wrong');
      // 触发重排以重放动画
      void cell.offsetWidth;
      cell.classList.add('wrong');
      setTimeout(() => cell.classList.remove('wrong'), 460); // 与抖动动画时长一致
      if (navigator.vibrate) navigator.vibrate(60);
    }
  }

  /* ============================================================
   * 计时
   * ============================================================ */
  function tick() {
    if (!state.running || !state.timingStarted) return;
    const sec = (performance.now() - state.t0) / 1000;
    els.timer.textContent = fmtTime(sec);
    state.raf = requestAnimationFrame(tick);
  }

  function stopTiming(finish) {
    state.running = false;
    state.timingStarted = false;
    cancelAnimationFrame(state.raf);
    els.timer.classList.remove('running');
    hideWaitHint();
    if (!finish) els.timer.textContent = fmtTime(0);
  }

  /* 同步两个“开始训练”按钮（侧栏 + 手机端方格下方）的状态 */
  function setStartButtons(running) {
    const disabled = running;
    const text = running ? t('side.running') : t('side.start');
    [els.startBtn, els.startBtnMobile].forEach((btn) => {
      btn.disabled = disabled;
      btn.textContent = text;
    });
  }

  function startRound() {
    if (state.running) return;
    buildBoard(state.size); // 重新洗牌
    els.resetLink.classList.add('show');
    setStartButtons(true);
    els.seg.classList.add('disabled');

    // 训练开始：自动收起侧栏（桌面缩成细栏 / 移动端收起抽屉）
    autoCollapse();

    // 下一帧再进入“等待按 1”状态：只显示 1，计时未开始
    requestAnimationFrame(() => {
      if (els.mainView.classList.contains('hidden')) return;
      state.running = true;
      state.timingStarted = false;
      els.board.classList.add('waiting1');
      showWaitHint();
    });
  }

  function finishRound() {
    stopTiming(true);
    const sec = (performance.now() - state.t0) / 1000;
    state.last = sec;
    els.timer.textContent = fmtTime(sec);
    els.lastTime.textContent = fmtTime(sec);

    // 成绩评级 + 对应标语
    const grade = computeGrade(state.size, sec);
    const g = grade.toLowerCase();
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((ch) => els.doneDialog.classList.remove('grade-' + ch));
    els.doneDialog.classList.add('grade-' + g);
    els.gradeLetter.textContent = grade;
    const pool = (lang() === 'zh' ? GRADE_SLOGANS : EN_GRADE_SLOGANS)[grade] || GRADE_SLOGANS[grade];
    els.doneSlogan.textContent = pick(pool);

    // 写入历史成绩（后台静默）
    if (state.user) {
      apiSaveRecord({
        name: state.user,
        size: state.size,
        seconds: Math.round(sec * 100) / 100,
        grade,
      });
    }

    els.doneSize.textContent = t('done.size', { size: `${state.size}×${state.size}`, total: state.total });
    els.doneTime.textContent = fmtTime(sec);
    els.doneOverlay.classList.remove('hidden');
  }

  function resetToIdle() {
    stopTiming(false);
    els.resetLink.classList.remove('show');
    els.seg.classList.remove('disabled');
    setStartButtons(false);
    // 回到待机：恢复用户的侧栏偏好
    applySbCollapsed(state.sbCollapsed);
    buildBoard(state.size);
  }

  function showOverlay(show) {
    els.doneOverlay.classList.toggle('hidden', !show);
  }

  /* ============================================================
   * 历史成绩
   * ============================================================ */
  const HIST_ALL = 'all';
  const pad2 = (n) => String(n).padStart(2, '0');

  function fmtDateShort(t) {
    const d = new Date(t);
    return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function fmtDateFull(t) {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  /* 组装当前筛选下的记录（新→旧） */
  function historyRows() {
    const data = state.histData || {};
    if (state.histFilter === HIST_ALL) {
      const all = [];
      Object.keys(data).forEach((mode) => {
        (data[mode] || []).forEach((r) => all.push({ mode, ...r }));
      });
      all.sort((a, b) => b.t - a.t);
      return all;
    }
    return (data[state.histFilter] || []).map((r) => ({ mode: state.histFilter, ...r }));
  }

  /* 当前筛选对应的规格数字（全部则为 null） */
  function historyFilterSize() {
    const m = /^(\d+)x\d+$/.exec(state.histFilter || '');
    return m ? Number(m[1]) : null;
  }

  /* 更新“清空”按钮文字，跟随当前选项卡 */
  function updateClearLabel() {
    const size = historyFilterSize();
    els.historyClear.textContent = size
      ? t('hist.clearMode', { size: `${size}×${size}` })
      : t('hist.clearAll');
  }

  function renderHistory() {
    const rows = historyRows();
    const summary = els.historySummary;
    updateClearLabel();

    if (!rows.length) {
      const hasAny = Object.values(state.histData || {}).some((arr) => arr && arr.length);
      summary.innerHTML = hasAny ? t('hist.none') : t('hist.empty1');
      els.historyList.innerHTML = `<div class="history-empty">${t('hist.empty1')}</div>`;
      return;
    }

    const best = rows.reduce((m, r) => (!m || r.s < m.s ? r : m), null);
    summary.innerHTML = t('hist.summary', {
      n: rows.length,
      best: best.s.toFixed(2),
      grade: best.g,
      mode: best.mode.replace('x', '×'),
    });

    const frag = document.createDocumentFragment();
    rows.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'history-row';

      const dt = document.createElement('span');
      dt.className = 'h-dt';
      dt.textContent = fmtDateShort(r.t);
      dt.title = fmtDateFull(r.t);

      const mode = document.createElement('span');
      mode.className = 'h-mode';
      mode.textContent = r.mode.replace('x', '×');

      const time = document.createElement('span');
      time.className = 'h-time';
      time.textContent = fmtTime(r.s);

      const chip = document.createElement('span');
      chip.className = `grade-chip g-${r.g.toLowerCase()}`;
      chip.textContent = r.g;

      row.append(dt, mode, time, chip);
      frag.appendChild(row);
    });
    els.historyList.innerHTML = '';
    els.historyList.appendChild(frag);
  }

  /* 规格筛选的“全部”按钮：折线图视图下隐藏（只画单一规格） */
  let historyAllBtn = null;
  let baseSettingsBound = false; // 设置面板基础监听只绑一次

  function syncModeActive(key) {
    els.historyModes.querySelectorAll('.seg-btn').forEach((x) =>
      x.classList.toggle('active', x.dataset.histMode === key)
    );
  }

  function buildModeChips() {
    const opts = [{ key: HIST_ALL, label: t('hist.all') }];
    SIZES.forEach((n) => opts.push({ key: `${n}x${n}`, label: `${n}×${n}` }));
    opts.forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn' + (o.key === state.histFilter ? ' active' : '');
      b.dataset.histMode = o.key;
      b.textContent = o.label;
      b.addEventListener('click', () => {
        state.histFilter = o.key;
        syncModeActive(o.key);
        refreshHistoryView();
      });
      els.historyModes.appendChild(b);
      if (o.key === HIST_ALL) historyAllBtn = b;
    });
  }

  /* 列表 / 折线图 切换按钮 */
  function buildViewSwitch() {
    const opts = [
      { key: 'list', labelKey: 'hist.list' },
      { key: 'chart', labelKey: 'hist.chart' },
    ];
    opts.forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn' + (o.key === state.histView ? ' active' : '');
      b.dataset.histView = o.key;
      b.textContent = t(o.labelKey);
      b.addEventListener('click', () => {
        state.histView = o.key;
        els.historyView.querySelectorAll('.seg-btn').forEach((x) =>
          x.classList.toggle('active', x.dataset.histView === o.key)
        );
        refreshHistoryView();
      });
      els.historyView.appendChild(b);
    });
  }

  /* 折线图的时间范围按钮 */
  function buildRangeChips() {
    const opts = [
      { key: 'today', labelKey: 'hist.rangeToday' },
      { key: '7', labelKey: 'hist.range7' },
      { key: '30', labelKey: 'hist.range30' },
      { key: '90', labelKey: 'hist.range90' },
      { key: '365', labelKey: 'hist.range365' },
    ];
    opts.forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn' + (o.key === state.histRange ? ' active' : '');
      b.dataset.histRange = o.key;
      b.textContent = t(o.labelKey);
      b.addEventListener('click', () => {
        state.histRange = o.key;
        els.chartRanges.querySelectorAll('.seg-btn').forEach((x) =>
          x.classList.toggle('active', x.dataset.histRange === o.key)
        );
        renderChart();
        animateViewIn(els.chartBox); // 切换时间范围：图表淡入
      });
      els.chartRanges.appendChild(b);
    });
  }

  /* 重放进场动画（淡入+轻微上移） */
  function animateViewIn(el) {
    el.classList.remove('view-anim');
    void el.offsetWidth; // 强制重排以重启动画
    el.classList.add('view-anim');
  }

  /* 切换列表 / 图表视图的可见性并刷新 */
  function refreshHistoryView() {
    const isChart = state.histView === 'chart';
    els.historyList.classList.toggle('hidden', isChart);
    els.chartPanel.classList.toggle('hidden', !isChart);
    els.historyClear.classList.toggle('hidden', isChart);

    // 折线图只画单一规格：隐藏“全部”，若当前是“全部”则改用当前训练规格
    if (historyAllBtn) historyAllBtn.classList.toggle('hidden', isChart);
    if (isChart && state.histFilter === HIST_ALL) {
      state.histFilter = `${state.size}x${state.size}`;
      syncModeActive(state.histFilter);
    }

    if (isChart) {
      renderChart();
      animateViewIn(els.chartPanel);
    } else {
      renderHistory();
      animateViewIn(els.historyList);
    }
  }

  /* ============================================================
   * 折线图（原生 SVG，无第三方依赖）
   * ============================================================ */
  function fmtDayShort(t) {
    const d = new Date(t);
    return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function rangeLabel() {
    const map = {
      today: 'hist.rangeToday', 7: 'hist.range7', 30: 'hist.range30',
      90: 'hist.range90', 365: 'hist.range365',
    };
    return t(map[state.histRange] || 'hist.range30');
  }

  /* 当前时间范围的最早时刻（毫秒时间戳） */
  function rangeCutMs() {
    if (state.histRange === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    const days = RANGE_DAYS[state.histRange];
    return Date.now() - (days || 30) * 86400000;
  }

  /* 按天汇总为三条线：当日最佳 / 当日平均 / 当日最差 */
  function chartSeries() {
    const data = state.histData || {};
    const mode = state.histFilter; // 折线图视图一定是单一规格
    const raw = (data[mode] || []).filter((r) => r.t >= rangeCutMs());
    if (!raw.length) return null;

    const dayMap = new Map();
    raw.forEach((r) => {
      const d = new Date(r.t);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      let g = dayMap.get(key);
      if (!g) {
        g = {
          noon: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime(),
          n: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
        };
        dayMap.set(key, g);
      }
      g.n += 1;
      g.sum += r.s;
      if (r.s < g.min) g.min = r.s;
      if (r.s > g.max) g.max = r.s;
    });

    const days = [...dayMap.values()].sort((a, b) => a.noon - b.noon);
    const round2 = (v) => Math.round(v * 100) / 100;
    return {
      mode,
      days,
      raw,
      best: days.map((g) => ({ t: g.noon, s: g.min })),
      avg: days.map((g) => ({ t: g.noon, s: round2(g.sum / g.n) })),
      worst: days.map((g) => ({ t: g.noon, s: g.max })),
    };
  }

  function renderChart() {
    const data = chartSeries();
    const meta = els.chartMeta;
    const box = els.chartBox;

    if (!data) {
      meta.textContent = `${rangeLabel()}：${t('chart.empty')}`;
      box.innerHTML = `<div class="history-empty">${t('chart.empty')}</div>`;
      els.chartLegend.innerHTML = '';
      return;
    }

    const spec = data.mode.replace('x', '×');
    const isToday = state.histRange === 'today';
    const sum = data.raw.reduce((s, r) => s + r.s, 0);
    const overallBest = Math.min(...data.raw.map((r) => r.s));
    const overallWorst = Math.max(...data.raw.map((r) => r.s));
    const overallAvg = sum / data.raw.length;

    if (isToday) {
      // 今天：只看每一条记录，不显示最高/最低两条线
      meta.innerHTML = t('chart.metaToday', {
        spec,
        n: data.raw.length,
        avg: overallAvg.toFixed(2),
        best: overallBest.toFixed(2),
      });
    } else {
      meta.innerHTML = t('chart.metaDaily', {
        range: rangeLabel(),
        spec,
        n: data.raw.length,
        d: data.days.length,
        best: overallBest.toFixed(2),
        avg: overallAvg.toFixed(2),
        worst: overallWorst.toFixed(2),
      });
    }

    // 组装要绘制的线
    const attempts = data.raw
      .slice()
      .sort((a, b) => a.t - b.t)
      .map((r) => ({ t: r.t, s: r.s }));
    const cGrid = cssVar('--chart-grid', '#e3e3e3');
    const cAxis = cssVar('--chart-axis', '#c8c8c8');
    const cLabel = cssVar('--chart-label', '#8a8a8a');
    const lines = [];
    if (isToday) {
      lines.push({ labelKey: 'chart.attempt', color: '#4aa8ff', dashed: false, flat: null, points: attempts });
      lines.push({ labelKey: 'chart.avgRef', color: cLabel, dashed: true, flat: overallAvg, points: [] });
    } else {
      STAT_LINES.forEach((l) =>
        lines.push({ labelKey: 'chart.' + l.key, color: l.color, dashed: false, flat: null, points: data[l.key] })
      );
    }

    // 图例
    els.chartLegend.innerHTML = lines
      .map(
        (l) =>
          `<span class="legend-item"><span class="legend-dot" style="background:${l.color}"></span>${t(l.labelKey)}</span>`
      )
      .join('');

    // 坐标范围：按容器实际尺寸铺满
    const W = Math.max(box.clientWidth || 0, 300);
    const H = Math.max(box.clientHeight || 0, 180);
    const M = { top: 14, right: 44, bottom: 36, left: 54 };
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;

    // 秒数范围
    const sVals = attempts.map((p) => p.s);
    lines.forEach((l) => l.points.forEach((p) => sVals.push(p.s)));
    if (lines.some((l) => l.flat !== null)) sVals.push(lines.find((l) => l.flat !== null).flat);
    const sMin = Math.min(...sVals);
    const sMax = Math.max(...sVals);
    const sPad = Math.max((sMax - sMin) * 0.12, sMax * 0.05, 1);
    const yMin = Math.max(0, sMin - sPad);
    const yMax = Math.max(sMax + sPad, yMin + 2);

    // 时间范围
    let tMin;
    let tMax;
    if (isToday) {
      const ts = attempts.map((p) => p.t);
      tMin = Math.min(...ts);
      tMax = Math.max(...ts);
      if (tMax === tMin) {
        tMin -= 1800000; // 只有一局时左右各留 30 分钟
        tMax += 1800000;
      }
    } else {
      const noons = data.days.map((d) => d.noon);
      tMin = Math.min(...noons);
      tMax = Math.max(...noons);
      if (tMax === tMin) {
        tMin -= 43200000;
        tMax += 43200000;
      }
    }

    const xAt = (t) => M.left + ((t - tMin) / (tMax - tMin)) * innerW;
    const yAt = (s) => M.top + innerH - ((s - yMin) / (yMax - yMin)) * innerH;
    const fmtSec = (v) => (v >= 100 ? `${Math.round(v)}s` : `${v.toFixed(1)}s`);
    const fmtHM = (t) => {
      const d = new Date(t);
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    };
    // 今天视图：按“第几次”等距排布横轴（不按真实时刻）
    const xToday = (i) =>
      attempts.length <= 1 ? M.left + innerW / 2 : M.left + (innerW * i) / (attempts.length - 1);

    // 横轴刻度
    const minTickGapPx = innerW / 14; // 太近的刻度丢弃，防止文字叠在一起

    let out = '';
    // 网格线 + 纵轴标签
    for (let i = 0; i <= 4; i++) {
      const sVal = yMin + ((yMax - yMin) * i) / 4;
      const y = yAt(sVal);
      out += `<line x1="${M.left}" y1="${y}" x2="${W - M.right}" y2="${y}" stroke="${cGrid}" stroke-width="1"/>`;
      out += `<text x="${M.left - 8}" y="${y + 4}" text-anchor="end" font-size="13" fill="${cLabel}">${fmtSec(sVal)}</text>`;
    }
    if (isToday) {
      // 今天：刻度按次数等距（至多标 6 个：第1次、第2次…）
      const n = attempts.length;
      const labelIdx =
        n <= 6
          ? attempts.map((_, i) => i)
          : [0, 1, 2, 3, 4, 5].map((k) => Math.round((k * (n - 1)) / 5));
      let lastTickX = -Infinity;
      [...new Set(labelIdx)].forEach((i) => {
        const x = xToday(i);
        if (x - lastTickX < minTickGapPx) return;
        lastTickX = x;
        out += `<text x="${x}" y="${H - 10}" text-anchor="middle" font-size="13" fill="${cLabel}">${t('chart.th', { n: i + 1 })}</text>`;
      });
    } else {
      // 日视图：直接从有数据的日期里均匀取刻度（天然无重复日期）
      const noons = data.days.map((d) => d.noon);
      const idxs =
        noons.length <= 6
          ? noons.map((_, i) => i)
          : [0, 1, 2, 3, 4, 5].map((k) => Math.round((k * (noons.length - 1)) / 5));
      let lastTickX = -Infinity;
      const shown = new Set();
      [...new Set(idxs)].forEach((i) => {
        const x = xAt(noons[i]);
        const label = fmtDayShort(noons[i]);
        if (x - lastTickX < minTickGapPx || shown.has(label)) return;
        lastTickX = x;
        shown.add(label);
        out += `<text x="${x}" y="${H - 10}" text-anchor="middle" font-size="13" fill="${cLabel}">${label}</text>`;
      });
    }
    // 边框
    out += `<line x1="${M.left}" y1="${M.top}" x2="${M.left}" y2="${H - M.bottom}" stroke="${cAxis}"/>`;
    out += `<line x1="${M.left}" y1="${H - M.bottom}" x2="${W - M.right}" y2="${H - M.bottom}" stroke="${cAxis}"/>`;

    // 绘制各条线
    lines.forEach((line) => {
      if (line.dashed) {
        const y = yAt(line.flat);
        out += `<line x1="${M.left}" y1="${y}" x2="${W - M.right}" y2="${y}" stroke="${line.color}" stroke-width="1.8" stroke-dasharray="7 5" opacity="0.9"/>`;
        out += `<text x="${W - M.right - 4}" y="${y - 4}" text-anchor="end" font-size="12" fill="${line.color}">${t(line.labelKey)} ${line.flat.toFixed(1)} ${t('unit.sec')}</text>`;
        return;
      }
      if (isToday) {
        // 今天：每次成绩按第几次等距连线
        const n = line.points.length;
        const ptStr = line.points.map((p, i) => `${xToday(i).toFixed(1)},${yAt(p.s).toFixed(1)}`);
        if (n > 1) {
          out += `<polyline points="${ptStr.join(' ')}" fill="none" stroke="${line.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
        }
        const skipDots = n > 90;
        if (!skipDots) {
          line.points.forEach((p, i) => {
            const tip = `${fmtHM(p.t)} · ${t('chart.th', { n: i + 1 })}：${p.s.toFixed(2)} ${t('unit.sec')}`;
            out += `<circle cx="${xToday(i)}" cy="${yAt(p.s)}" r="4" fill="#fff" stroke="${line.color}" stroke-width="2"><title>${tip}</title></circle>`;
          });
        }
        return;
      }
      const pts = line.points.map((p) => `${xAt(p.t).toFixed(1)},${yAt(p.s).toFixed(1)}`);
      if (pts.length > 1) {
        out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${line.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      }
      // 点太多时省略圆点，避免“挤成一团”（仅留连线）
      const skipDots = line.points.length > 90;
      if (!skipDots) {
        line.points.forEach((p) => {
          const x = xAt(p.t);
          const y = yAt(p.s);
          const tip = `${t(line.labelKey)}：${p.s.toFixed(2)} ${t('unit.sec')}\n${fmtDayShort(p.t)}（${spec}）`;
          out += `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${line.color}" stroke-width="2"><title>${tip}</title></circle>`;
        });
      }
    });

    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="历史成绩折线图">${out}</svg>`;
  }

  async function openHistory() {
    if (!state.user) return;
    clearTimeout(state.histCloseTimer);
    els.historyOverlay.classList.remove('history-closing');
    els.historyOverlay.classList.remove('hidden');
    els.historySummary.textContent = `${t('hist.loading')}…`;
    els.historyList.innerHTML = `<div class="history-empty">${t('hist.loading')}…</div>`;
    const data = await apiGetRecords(state.user);
    if (els.historyOverlay.classList.contains('hidden')) return; // 已关闭
    if (data === null) {
      els.historySummary.textContent = t('hist.errOld');
      state.histData = {};
    } else {
      state.histData = data;
    }
    refreshHistoryView();
  }

  function closeHistory() {
    const ov = els.historyOverlay;
    if (ov.classList.contains('hidden')) return;
    ov.classList.add('history-closing'); // 播放 iOS 风格关闭动画后隐藏
    clearTimeout(state.histCloseTimer);
    state.histCloseTimer = setTimeout(() => {
      ov.classList.add('hidden');
      ov.classList.remove('history-closing');
    }, 320);
  }

  async function onHistoryClear() {
    if (!state.user) return;
    const size = historyFilterSize();
    const scope = size ? t('hist.clearMode', { size: `${size}×${size}` }) : t('hist.clearAll');
    if (lang() === 'zh') {
      if (!window.confirm(`确定要清空「${state.user}」的${scope}吗？此操作不可恢复。`)) return;
    } else if (!window.confirm(`Clear ${scope} for user "${state.user}"? This cannot be undone.`)) return;
    const ok = await apiClearRecords(state.user, size);
    if (ok) {
      if (size) {
        delete state.histData[`${size}x${size}`];
      } else {
        state.histData = {};
      }
      renderHistory();
    } else {
      els.historySummary.textContent = t('hist.errClear');
    }
  }

  /* ============================================================
   * 事件绑定
   * ============================================================ */
  els.loginForm.addEventListener('submit', handleLoginSubmit);

  // 规格选择
  SIZES.forEach((n) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg-btn' + (n === state.size ? ' active' : '');
    btn.dataset.size = String(n);
    btn.textContent = `${n}×${n}`;
    btn.setAttribute('aria-pressed', String(n === state.size));
    btn.addEventListener('click', () => {
      if (state.running) return;
      state.size = n;
      els.seg.querySelectorAll('.seg-btn').forEach((b) => {
        const active = Number(b.dataset.size) === n;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      animateSizeSwitch(n); // 带切换动画重建
    });
    els.seg.appendChild(btn);
  });

  // 选项栏开关按钮（顶栏：桌面收起/展开面板，移动端开合抽屉）
  els.sidebarToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar(true);
  });

  // 移动端抽屉：点击外部区域关闭
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (document.body.classList.contains('sb-collapsed')) return; // 抽屉本来就关着
    if (els.sidebar.contains(e.target)) return;
    if (els.sidebarToggle.contains(e.target)) return;
    applySbCollapsed(true);
  });

  els.startBtn.addEventListener('click', startRound);
  els.startBtnMobile.addEventListener('click', startRound);

  els.resetLink.addEventListener('click', () => {
    if (!state.running) return;
    resetToIdle();
  });

  els.againBtn.addEventListener('click', () => {
    showOverlay(false);
    startRound();
  });

  els.backBtn.addEventListener('click', () => {
    showOverlay(false);
    resetToIdle();
  });

  els.userChip.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  els.switchBtn.addEventListener('click', () => {
    toggleMenu(false);
    doLogout();
  });

  // 历史成绩
  els.historyBtn.addEventListener('click', openHistory);
  els.historyClose.addEventListener('click', closeHistory);
  els.historyOverlay.addEventListener('click', (e) => {
    if (e.target === els.historyOverlay) closeHistory();
  });
  els.historyClear.addEventListener('click', onHistoryClear);

  // 设置
  els.settingsBtn.addEventListener('click', openSettings);
  els.settingsClose.addEventListener('click', closeSettings);
  els.settingsOverlay.addEventListener('click', (e) => {
    if (e.target === els.settingsOverlay) closeSettings();
  });

  document.addEventListener('click', (e) => {
    if (!els.userMenu.contains(e.target)) toggleMenu(false);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!els.settingsOverlay.classList.contains('hidden')) {
        closeSettings();
        return;
      }
      if (!els.historyOverlay.classList.contains('hidden')) {
        closeHistory();
        return;
      }
      toggleMenu(false);
      showOverlay(false);
      if (isMobile() && !document.body.classList.contains('sb-collapsed')) {
        applySbCollapsed(true);
      } else if (!state.running) {
        resetToIdle();
      }
    }
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // 视口在桌面/移动之间切换时重算侧栏状态
      const curMobile = isMobile();
      if (curMobile !== lastMobile) {
        lastMobile = curMobile;
        const pref = readSidebarPref();
        state.sbCollapsed = pref === null ? curMobile : pref;
        if (!state.running) applySbCollapsed(state.sbCollapsed);
      }
      sizeCells();
      // 折线图打开时：随窗口变化重新铺满
      if (state.histView === 'chart' && !els.historyOverlay.classList.contains('hidden')) {
        renderChart();
      }
    }, 120);
  });

  /* ============================================================
   * 启动：自动登录 / 显示登录页
   * ============================================================ */
  (async function init() {
    // 读取侧栏折叠偏好（默认：桌面展开 / 移动端收起）
    const pref = readSidebarPref();
    state.sbCollapsed = pref === null ? lastMobile : pref;
    applySbCollapsed(state.sbCollapsed);
    buildModeChips();    // 历史成绩规格筛选
    buildViewSwitch();   // 记录列表 / 折线图
    buildRangeChips();   // 折线图时间范围
    buildSettingsUi();   // 设置面板
    buildLoginLang();    // 登录页语言选择
    applySettingsVisuals(); // 应用默认主题（跟随系统）
    applyLanguageUI();      // 应用默认语言（英语）与静态文案

    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      setHint(t('login.auto', { name: saved }));
      try {
        const { httpOk, data } = await apiLogin(saved);
        if (httpOk && data.ok) {
          enterApp(saved, !!data.isNew);
          return;
        }
        if (data && data.error) {
          localStorage.removeItem(STORE_KEY);
        }
      } catch {
        enterApp(saved, false);
        return;
      }
    }
    // 需要手动登录
    applyLoginPageLang();
    els.nameInput.focus();
    setHint(t('login.hint'));
    refreshLoginUsers();
  })();
})();
