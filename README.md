# The Next Clean.

핸드헬드 청소기 GLB를 스크롤로 보여주는 페이지입니다. Vite와 Three.js로 되어 있습니다.

스크롤을 내리면 모델이 다섯 바퀴 돌며 가까워지고, 타이틀 **The Next Clean.** 이 나타난 뒤 모델이 왼쪽으로 밀리며 설명 문구가 열립니다.

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
