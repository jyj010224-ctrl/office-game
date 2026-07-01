const express = require("express");
const db = require("./db");

const app = express();
app.use(express.json());

// ── 직급 설정 ──────────────────────────────
const RANKS = [
  { name: "인턴",  cost:     0, rate:  0 },
  { name: "사원",  cost:   100, rate: 80 },
  { name: "주임",  cost:   300, rate: 65 },
  { name: "대리",  cost:   600, rate: 50 },
  { name: "과장",  cost:  1000, rate: 40 },
  { name: "팀장",  cost:  2000, rate: 30 },
  { name: "국장",  cost:  4000, rate: 22 },
  { name: "이사",  cost:  7000, rate: 15 },
  { name: "대표",  cost: 12000, rate:  8 },
];

const COOLDOWN = {
  일하기:   30 * 60 * 1000,
  아부하기: 10 * 60 * 1000,
  대결:     60 * 60 * 1000,
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
function kakaoReply(text) {
  return {
    version: "2.0",
    template: { outputs: [{ simpleText: { text } }] }
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

    const gain = Math.floor(Math.random() * 101) + 50;
    u.points += gain;
    u.last_work = Date.now();
    db.saveUser(u);
    return `💼 [${RANKS[u.rank].name}] ${nickname}\n\n야근 완료! 수고했어요.\n💰 +${gain} 포인트\n📊 보유: ${u.points} 포인트`;
  }

  // 아부하기
  if (msg === "아부하기") {
    const cd = checkCooldown(u.last_boss, "아부하기");
    if (cd) return `⏰ ${cd}`;

    const roll = Math.random();
    let gain, comment;
    if (roll < 0.05) {
      gain = 150;
      comment = '"자네가 없으면 회사가 안 돌아가!" 부장님 감동! 🎉';
    } else if (roll < 0.15) {
      gain = -30;
      comment = "아부가 너무 티났어요... 부장님이 불쾌해했습니다. 😬";
    } else {
      gain = Math.floor(Math.random() * 61) + 20;
      comment = '"고마워, 열심히 하게!" 부장님이 흐뭇해했어요. 😊';
    }

    u.points = Math.max(0, u.points + gain);
    u.last_boss = Date.now();
    db.saveUser(u);
    const sign = gain >= 0 ? "+" : "";
    return `🙇 [${RANKS[u.rank].name}] ${nickname}\n\n${comment}\n💰 ${sign}${gain} 포인트\n📊 보유: ${u.points} 포인트`;
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
      return `✨ 강화 성공!\n\n${prevName} → ${RANKS[u.rank].name} 승진!\n💰 -${next.cost}pt\n📊 잔여: ${u.points}pt` +
        (isMax ? "\n\n🎉 드디어 대표가 됐습니다!" : "");
    } else {
      u.rank = 0;
      db.saveUser(u);
      return `💥 강화 실패!\n\n${prevName} → 인턴으로 강등...\n💰 -${next.cost}pt\n📊 잔여: ${u.points}pt\n\n😭 처음부터 다시 시작이에요!`;
    }
  }

  // 대결
  if (msg.startsWith("대결")) {
    const targetName = msg.replace("대결", "").trim();
    if (!targetName) return "❌ 사용법: 대결 [상대닉네임]";

    const cd = checkCooldown(u.last_battle, "대결");
    if (cd) return `⏰ ${cd}`;

    const t = db.getUserByNickname(targetName);
    if (!t) return `❌ ${targetName}님은 아직 게임을 시작하지 않았어요.`;
    if (t.id === userId) return "❌ 자기 자신과는 대결할 수 없어요.";

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

  // 도움말
  if (msg === "도움말" || msg === "명령어") {
    return (
      "📋 직장인 육성 게임\n\n" +
      "💼 일하기 - 포인트 획득 (30분 쿨)\n" +
      "🙇 아부하기 - 포인트 획득 (10분 쿨)\n" +
      "⚡ 강화 - 승진 도전 (실패 시 인턴 추락!)\n" +
      "⚔️ 대결 [닉네임] - PvP (1시간 쿨)\n" +
      "👤 내정보 - 내 현황 확인\n" +
      "🏆 랭킹 - 전체 순위\n\n" +
      "인턴→사원→주임→대리→과장→팀장→국장→이사→대표"
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

    res.json(kakaoReply(reply));
  } catch (e) {
    console.error(e);
    res.status(500).json(kakaoReply("오류가 발생했어요. 잠시 후 다시 시도해주세요."));
  }
});

app.get("/", (_, res) => res.send("Office Game Bot Running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
