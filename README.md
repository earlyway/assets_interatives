# The Next Clean.

핸드헬드 청소기 GLB를 스크롤로 보여주는 페이지입니다. Vite와 Three.js로 되어 있습니다.

스크롤은 화면 높이 28개이고, 장면 여섯이 그 진행도에 고정됩니다.

1. OPEN — 작은 정면
2. TURN — 다섯 바퀴를 돌며 다가오고, 아래에 The Next Clean.
3. FORM — 정면, 옆면의 꼬임, 롤러 헤드
4. TYPE — 꼬임이 그립이 된다.
5. SPEC — 왼쪽 제품, 오른쪽 설명
6. CLOSE — 다시 가운데로 모이며 한 줄만 남음

## 실행

```bash
npm install
npm run dev
```

개발 서버는 [http://localhost:5180](http://localhost:5180) 입니다.

```bash
npm run build
npm run preview
```

## 구성

- `assets/clean.glb` — 화면에 올라가는 모델
- `images/` — 정면, 측면, 상·하·후면 참고 렌더
- `src/main.js` — 스크롤에 따른 카메라와 카피
- `src/style.css` — 블랙 배경의 타이포와 레이아웃
- `DESIGN-bugatti.md` — 적용한 타이포·색 기준
