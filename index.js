const express = require("express");
const db = require("./db");

const app = express();
app.use(express.json());

// ── 이미지 베이스 URL ───────────────────────
const IMG_BASE = "https://raw.githubusercontent.com/jyj010224-ctrl/office-game/main/images/";

// ── 직급 설정 ──────────────────────────────
const RANKS = [
  { name: "신입인턴",     cost:     0, rate:  0,  img: IMG_BASE + "%EC%8B%A0%EC%9E%85%EC%9D%B8%ED%84%B4.png" },
  { name: "응애인턴",     cost:   100, rate: 85,  img: IMG_BASE + "%EC%9D%91%EC%95%A0%EC%9D%B8%ED%84%B4.png" },
  { name: "아가인턴",     cost:   200, rate: 80,  img: IMG_BASE + "%EC%9D%B8%ED%84%B4.png" },
  { name: "사람된인턴",   cost:   350, rate: 75,  img: IMG_BASE + "%EC%82%AC%EB%9E%8C%EB%90%9C%EC%9D%B8%ED%84%B4.png" },
  { name: "베이비 사원",  cost:   500, rate: 70,  img: IMG_BASE + "%EB%B2%A0%EC%9D%B4%EB%B9%84%EC%82%AC%EC%9B%90.png" },
  { name: "새싹사원",     cost:   700, rate: 60,  img: IMG_BASE + "%EC%83%88%EC%8B%B9%EC%82%AC%EC%9B%90.png" },
  { name: "정사원",       cost:  1000, rate: 50,  img: IMG_BASE + "%EC%A0%95%EC%82%AC%EC%9B%90.png" },
  { name: "잔뼈굵은사원", cost:  1500, rate: 40,  img: IMG_BASE + "%EC%9E%94%EB%BC%88%EA%B5%B5%EC%9D%80%EC%82%AC%EC%9B%90.png" },
  { name: "새싹 주임",    cost:  2500, rate: 35,  img: IMG_BASE + "%EC%83%88%EC%8B%B9%EC%A3%BC%EC%9E%84.png" },
  { name: "주임",         cost:  4000, rate: 28,  img: IMG_BASE + "%EC%A3%BC%EC%9E%84.png" },
  { name: "베테랑 주임",  cost:  6000, rate: 22,  img: IMG_BASE + "%EB%B2%A0%ED%85%8C%EB%9E%91%20%EC%A3%BC%EC%9E%84.png" },
  { name: "응애대표",     cost:  9000, rate: 15,  img: IMG_BASE + "%EC%9D%91%EC%95%A0%EB%8C%80%ED%91%9C.png" },
  { name: "팀장",         cost: 12000, rate: 10,  img: IMG_BASE + "%ED%8C%80%EC%9E%A5.png" },
  { name: "분노팀장",     cost: 16000, rate:  7,  img: IMG_BASE + "%EB%B6%84%EB%85%B8%ED%8C%80%EC%9E%A5.png" },
  { name: "테토대표",     cost: 20000, rate:  5,  img: IMG_BASE + "%ED%85%8C%ED%86%A0%EB%8C%80%ED%91%9C.png" },
];

const COOLDOWN = {
  일하기:       3 * 1000,  // 3초
  아부하기:    30 * 1000,  // 30초
  대결:                0,  // 쿨타임 없음
};

// ── 쿨타임 체크 ────────────────────────────
function checkCooldown(last, type) {
  const remain = COOLDOWN[type] - (Date.now() - last);
  if (remain <= 0) return null;
  const min = Math.floor(remain / 60000);
  const sec = Math.floor((remain % 60000) / 1000);
  return min > 0 ? `${min}분 ${sec}초 후에 가능해요!` : `${sec}초 후에 가능해요!`;
}

// ── 카카오 응답 형식 ────────────────────────
function kakaoReply(text, buttons, imgUrl) {
  const quickReplies = (buttons || ["일하기", "아부하기", "강화", "대결", "내정보", "랭킹"]).map(label => ({
    action: "message",
    label,
    messageText: label
  }));
  const output = imgUrl
    ? { basicCard: { description: text, thumbnail: { imageUrl: imgUrl } } }
    : { simpleText: { text } };
  return {
    version: "2.0",
    template: { outputs: [output], quickReplies }
  };
}

// ── 명령어 처리 ────────────────────────────
function handleMessage(userId, nickname, msg) {
  msg = msg.trim();
  const u = db.getUser(userId, nickname);

  // 일하기
  if (msg === "일하기") {
    const cd = checkCooldown(u.last_work, "일하기");
    if (cd) return `⏰ ${cd}`;

    let gain, workComment, workImg;
    const roll = Math.random();
    if (roll < 0.10) {
      gain = 1000;
      workComment = "우편통지서 1000장 돌파!! 🎉 축하드립니다 상여금을 받았어요!";
      workImg = IMG_BASE + "%EA%B3%A0%EC%86%8C%EC%9E%A51000.png";
    } else if (roll < 0.30) {
      gain = 0;
      u.points = 0;
      workComment = "여기 놀러왔나요? 일 제대로 안해요? 그러다가 월급 회수하는 수가 있어요.. 😤";
      workImg = RANKS[u.rank].img;
    } else if (roll < 0.40) {
      gain = -50;
      workComment = "회사를 지금 몇 개월을 다녔는데 아직도 길을 몰라요? 😑";
      workImg = IMG_BASE + "%EC%9D%BC%EC%95%88%ED%95%B4.png";
    } else {
      gain = Math.floor(Math.random() * 101) + 50;
      const workComments = [
        "오늘 고소장 많이 썼네 ^^.",
        "열심히 우편통지서 입력중 ..",
        "열심히 고소장 쓰는 중 .. ..",
        "오늘 합의가 많이 됐나봐 ^^",
        "야근하는거야?",
        "오늘 점심 뭐야?",
        "오늘 전체 회의입니다^^",
        "오늘 점심 어디로 가지 . .. 그냥 김양갈까..",
        "우체국 다녀오겠습니다!",
        "타다닥 . .. 타다닥...",
        "네 전화받았습니다",
        "네 법무법인대상입니다~",
        "합의는 저희가 기준이 ..~..",
        "보고서 언제 올리는거죠?",
        "회의하러 4층으로 올라오시죠.",
        "DT 가실래요?"
      ];
      workComment = workComments[Math.floor(Math.random() * workComments.length)];
      workImg = RANKS[u.rank].img;
    }
    u.points += gain;
    u.last_work = Date.now();
    db.saveUser(u);
    return { text: `💼 [${RANKS[u.rank].name}] ${u.nickname}\n\n${workComment}\n💰 +${gain} 포인트\n📊 보유: ${u.points} 포인트`, img: workImg };
  }

  // 아부하기
  if (msg === "아부하기") {
    const cd = checkCooldown(u.last_boss, "아부하기");
    if (cd) return `⏰ ${cd}`;

    const roll = Math.random();
    let gain, comment, bossImg;
    if (roll < 0.05) {
      // 5% 아부의 신
      gain = 2000;
      comment = "아부의 신 강림...✨ 대표님이 극찬하셨습니다!";
      bossImg = IMG_BASE + "%EC%95%84%EB%B6%80%EC%9D%98%EC%8B%A0.png";
    } else if (roll < 0.15) {
      // 10% 부당수급
      const lost = u.points;
      u.points = 0;
      u.last_boss = Date.now();
      db.saveUser(u);
      return { text: `🚨 [부당수급]\n\n저녁에 대표님이랑 같이 밥 먹었어??\n해당 분 전량 회수입니다.\n\n💸 -${lost} 포인트\n📊 보유: 0 포인트`, img: IMG_BASE + "%EC%A0%80%EB%85%81.png" };
    } else if (roll < 0.25) {
      // 10% 역효과
      gain = -100;
      comment = "저기 근데 아부도 적당히 해야되는거 아니에요? 😬";
      bossImg = RANKS[u.rank].img;
    } else {
      gain = Math.floor(Math.random() * 451) + 50; // 50~500pt
      const normalComments = [
        "ㅎㅎ 고마워 오늘 회식할까요? 😊",
        "ㅎㅎㅎ 철썩 철썩(등을 때리며) 그정돈 아닌데~~ 😄",
        "(그렇게 영원히 점심시간이 끝나지 않았다) 😌",
        "만두타임 가질까 ? ^^ ㅎㅎ 🥟",
        "ㅎㅎ 고맙네요 오늘은 제가 지오바네 쏠게요 😊",
        "기분이다 바나프레소 사줄게요 😊",
        "비품으로 과자 더 추가해줄게요^^ 😊",
        "요즘 그게 재밌다던데~ 같이 그럼 갈래요? 😊",
        "커몬커몬~^^ 윗층으로 올라오세요 😊"
      ];
      comment = normalComments[Math.floor(Math.random() * normalComments.length)];
      bossImg = RANKS[u.rank].img;
    }

    u.points = Math.max(0, u.points + gain);
    u.last_boss = Date.now();
    db.saveUser(u);
    const sign = gain >= 0 ? "+" : "";
    return { text: `🙇 [${RANKS[u.rank].name}] ${u.nickname}\n\n${comment}\n💰 ${sign}${gain} 포인트\n📊 보유: ${u.points} 포인트`, img: bossImg };
  }

  // 강화
  if (msg === "강화") {
    if (u.rank >= RANKS.length - 1)
      return "👑 이미 대표입니다! 최고 직급이에요.";

    const next = RANKS[u.rank + 1];
    if (u.points < next.cost)
      return `⚠️ 포인트 부족!\n\n현재: ${u.points}pt\n필요: ${next.cost}pt\n부족: ${next.cost - u.points}pt`;

    u.points -= next.cost;
    u.total_enhance++;
    const success = Math.random() * 100 < next.rate;
    const prevName = RANKS[u.rank].name;

    if (success) {
      u.rank++;
      db.saveUser(u);
      const isMax = u.rank >= RANKS.length - 1;
      return { text: `✨ 강화 성공!\n\n${prevName} → ${RANKS[u.rank].name} 승진!\n💰 -${next.cost}pt\n📊 잔여: ${u.points}pt` + (isMax ? "\n\n🎉 드디어 테토대표가 됐습니다!" : ""), img: RANKS[u.rank].img };
    } else {
      // 실패: 직급 높을수록 강등 확률 증가 (기본 25%, 최대 60%)
      const demoteChance = Math.min(0.25 + (u.rank / RANKS.length) * 0.35, 0.60);
      const demote = Math.random() < demoteChance;
      if (demote) {
        u.rank = 0;
        db.saveUser(u);
        return `💥 강화 실패!\n\n${prevName} → 초보 인턴으로 강등...\n💰 -${next.cost}pt\n📊 잔여: ${u.points}pt\n\n😭 처음부터 다시 시작이에요!`;
      } else {
        db.saveUser(u);
        return `💥 강화 실패!\n\n${prevName} 직급 유지...\n💰 -${next.cost}pt\n📊 잔여: ${u.points}pt\n\n😮‍💨 다행히 강등은 면했어요!`;
      }
    }
  }

  // 대결
  if (msg.startsWith("대결")) {
    const targetName = msg.replace("대결", "").trim();
    if (!targetName) return "⚔️ 대결 방법\n\n버튼을 닫고 채팅창에\n'대결 홍길동'\n이렇게 상대 닉네임을 입력해주세요!";

    const cd = checkCooldown(u.last_battle, "대결");
    if (cd) return `⏰ ${cd}`;

    const t = db.getUserByNickname(targetName);
    if (!t) return `❌ ${targetName}님은 아직 게임을 시작하지 않았어요.`;
    if (t.id === userId) return "❌ 자기 자신과는 대결할 수 없어요.";

    // 20% 확률 면담 이벤트
    if (Math.random() < 0.2) {
      const penalty = Math.min(u.points, 500);
      const tPenalty = Math.min(t.points, 500);
      u.points = Math.max(0, u.points - 500);
      t.points = Math.max(0, t.points - 500);
      u.last_battle = Date.now();
      db.saveUser(u);
      db.saveUser(t);
      return { text: `🚨 아니 지금 왜 싸우는거야?\n면담하러 둘 다 회의실로 올라와요.\n\n[${RANKS[u.rank].name}] ${nickname} -${penalty}pt\n[${RANKS[t.rank].name}] ${targetName} -${tPenalty}pt`, img: IMG_BASE + "%EC%8B%B8%EC%9A%B0%EC%A7%80%EB%A7%88.png" };
    }

    const uPower = u.rank * 10 + Math.random() * 100;
    const tPower = t.rank * 10 + Math.random() * 100;
    const prize = Math.min(Math.max(Math.floor(t.points * 0.1), 50), 500);

    u.last_battle = Date.now();

    if (uPower >= tPower) {
      u.points += prize;
      t.points = Math.max(0, t.points - prize);
      db.saveUser(u);
      db.saveUser(t);
      return `⚔️ 대결 결과\n\n[${RANKS[u.rank].name}] ${nickname}\n  🆚\n[${RANKS[t.rank].name}] ${targetName}\n\n🏆 ${nickname} 승리!\n💰 +${prize}pt`;
    } else {
      u.points = Math.max(0, u.points - prize);
      t.points += prize;
      db.saveUser(u);
      db.saveUser(t);
      return `⚔️ 대결 결과\n\n[${RANKS[u.rank].name}] ${nickname}\n  🆚\n[${RANKS[t.rank].name}] ${targetName}\n\n🏆 ${targetName} 승리!\n💸 -${prize}pt`;
    }
  }

  // 내정보
  if (msg === "내정보") {
    const isMax = u.rank >= RANKS.length - 1;
    const nextInfo = isMax
      ? "🎖 최고 직급 달성!"
      : `다음: ${RANKS[u.rank + 1].name} (${RANKS[u.rank + 1].cost}pt / 성공률 ${RANKS[u.rank + 1].rate}%)`;
    return `👤 [${RANKS[u.rank].name}] ${nickname}\n\n💰 포인트: ${u.points}\n🔨 강화 시도: ${u.total_enhance}회\n\n${nextInfo}`;
  }

  // 랭킹
  if (msg === "랭킹") {
    const users = db.getRanking();
    if (!users.length) return "아직 게임을 시작한 사람이 없어요!";
    const medals = ["🥇", "🥈", "🥉"];
    const lines = ["🏢 사내 직급 랭킹\n"];
    users.forEach((u, i) => {
      lines.push(`${medals[i] || i + 1 + "."} [${RANKS[u.rank].name}] ${u.nickname} - ${u.points}pt`);
    });
    return lines.join("\n");
  }

  // 이름설정
  if (msg.startsWith("이름설정")) {
    const newName = msg.replace("이름설정", "").trim();
    if (!newName) return "❌ 사용법: 이름설정 [원하는이름]";
    if (newName.length > 10) return "❌ 이름은 10자 이내로 해주세요!";
    const existing = db.getUserByNickname(newName);
    if (existing && existing.id !== userId) return `❌ "${newName}"은 이미 사용 중인 이름이에요!`;
    u.nickname = newName;
    db.saveUser(u);
    return `✅ 이름이 "${newName}"으로 설정됐어요!\n대결할 때 이 이름으로 표시돼요.`;
  }

  // 도움말
  if (msg === "도움말" || msg === "명령어") {
    return (
      "✏️ 먼저 '이름설정 [이름]'으로 닉네임을 설정하고 게임을 시작해보세요!\n🏆 랭킹에서 상대방 이름 확인 후 '대결 [이름]'으로 대결 신청하세요!\n\n📋 직장인 육성 게임\n\n" +
      "✏️ 이름설정 [이름] - 게임 내 닉네임 설정\n" +
      "💼 일하기 - 포인트 획득 (3초 쿨)\n" +
      "🙇 아부하기 - 포인트 획득 (30초 쿨)\n" +
      "⚡ 강화 - 승진 도전 (실패 시 직급유지 or 초보인턴 강등!)\n" +
      "⚔️ 대결 [닉네임] - PvP\n" +
      "👤 내정보 - 내 현황 확인\n" +
      "🏆 랭킹 - 전체 순위\n\n" +
      "신입인턴→응애인턴→아가인턴→사람된인턴→베이비사원→새싹사원→정사원→잔뼈굵은사원→새싹주임→주임→베테랑주임→응애대표→팀장→분노팀장→테토대표"
    );
  }

  return null; // 해당 없는 메시지는 무응답
}

// ── 카카오 웹훅 엔드포인트 ─────────────────
app.post("/kakao", (req, res) => {
  try {
    const body = req.body;
    const userId   = body.userRequest.user.id;
    const nickname = body.userRequest.user.properties?.nickname || "익명";
    const msg      = body.userRequest.utterance;

    const reply = handleMessage(userId, nickname, msg);
    if (!reply) return res.status(200).json(kakaoReply(""));

    if (typeof reply === "object") {
      res.json(kakaoReply(reply.text, null, reply.img));
    } else {
      res.json(kakaoReply(reply));
    }
  } catch (e) {
    console.error(e);
    res.status(500).json(kakaoReply("오류가 발생했어요. 잠시 후 다시 시도해주세요."));
  }
});

app.get("/", (_, res) => res.send("Office Game Bot Running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
