# Duvi · 듀비

영어와 한국어 자막을 함께 보며 강의를 공부하는 로컬 웹앱입니다. MIT OpenCourseWare와 YouTube 강의를 한 라이브러리에서 재생하고, 문장별 이동·반복·자동 멈춤·이어보기를 지원합니다.

## 실행

현재 전체 기능은 **Windows + Node.js 24 이상**에서 지원합니다. ChatGPT 인증 정보 보관에는 Windows DPAPI를 사용합니다.

```powershell
npm ci
npm run setup -- --youtube
npm run build
npm start
```

[플레이어 열기](http://127.0.0.1:6103). 준비가 끝난 뒤에는 `Start-Study.vbs`를 실행해 서버와 브라우저를 열 수 있습니다.

`setup`은 MIT 공식 서버에서 26개 강의의 영어 자막을 받아 준비합니다. 기존 자막 파일은 덮어쓰지 않습니다. `--youtube` 옵션은 Windows용 yt-dlp를 고정된 공식 릴리스에서 내려받고 SHA-256을 확인합니다. 영상 파일은 내려받지 않습니다. MIT 강의만 이용하려면 옵션 없이 `npm run setup`을 실행하세요.

## 사용

- 왼쪽 라이브러리에서 강의를 검색하고 선택합니다.
- **강의 추가**에서 YouTube 영상 주소를 등록합니다. 영어 자막을 가져올 수 없다면 SRT/VTT 파일(2MB 이하)을 보완할 수 있습니다.
- **설정**에서 ChatGPT 계정을 연결하고, **번역 상태**에서 모델과 5분/전체 번역 범위를 선택합니다. 계정에서 제공하는 접근 권한과 사용 한도가 적용됩니다.
- 번역 요청은 영어 자막과 앞뒤 문맥을 OpenAI로 보냅니다. 완료한 번역은 PC에 저장하며 다시 재생할 때 재사용합니다. 중단 후에는 미완료 구간을 이어서 처리합니다.
- Chrome 기기 내 번역을 선택할 수도 있습니다. 브라우저의 Translator API 지원과 언어 모델 준비가 필요합니다.
- 입력창과 대화상자 밖에서 `←`/`→` 문장 이동, `R` 반복, `F` 전체화면을 사용합니다.
- 전체화면에서는 영상 영역 크기를 고정합니다. 종료 버튼과 `Esc`를 지원합니다.

## 구조와 저장 위치

```text
브라우저 UI (Vite로 빌드한 일반 JavaScript)
  ├─ MIT HTML video / YouTube IFrame Player
  └─ 같은 주소의 Node.js API
       ├─ 강의·영어 자막 관리
       ├─ ChatGPT 인증 및 문맥 번역
       └─ 강의별 JSON 저장
```

| 위치 | 내용 | Git 포함 |
| --- | --- | --- |
| `src/` | 화면, 재생·자막 동기화 | 예 |
| `backend/` | 로컬 API, 로그인, 번역 코드 | 예 |
| `backend/data/` | 설치 시 준비하는 MIT 영어 자막 | 아니요 |
| `backend/library/` | 사용자가 추가한 강의·자막 | 아니요 |
| `backend/translations/` | 저장한 AI 번역 | 아니요 |
| `%LOCALAPPDATA%/StudyLibraryPreview/` | DPAPI로 암호화한 인증 정보 | 아니요 |

서버는 `127.0.0.1:6103`에만 바인딩합니다. 인증 토큰은 브라우저로 전달하지 않습니다. 학습 데이터·번역·로그·빌드 결과·node_modules는 저장소에서 제외됩니다. 다른 PC에서 저장한 번역을 사용하려면 데이터 폴더를 별도로 백업·복원하세요. 인증 정보는 해당 PC에서 로그인해 준비하세요.

## 검증

```powershell
npm test
npm run build
```

인증/PKCE, 토큰 검증, 번역 응답·중단·재개, 자막 파싱, HTTP 요청 보호, 재생 위치 복원 등을 검사합니다. 실제 브라우저 검증 범위와 미검증 항목은 [TEST-RESULTS.md](TEST-RESULTS.md)에 기록합니다.

## 자료 출처와 제한

MIT 영상과 영어 자막은 [MIT OpenCourseWare](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/)가 제공합니다. 해당 자료의 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 조건이 적용됩니다. 이 저장소에는 강의 자료 자체 대신 공식 출처 목록과 설치 스크립트를 넣습니다.

YouTube 영상·자막의 권리는 각 권리자에게 있습니다. 자막을 가져올 수 없는 영상과 외부 재생이 제한된 영상은 지원하지 못할 수 있습니다. 한국어 자막은 AI 번역이며 정확성을 보증하지 않습니다. 외부 의존성의 출처와 라이선스는 [THIRD-PARTY.md](backend/THIRD-PARTY.md)를 참고하세요.

전체 기능에는 로컬 Node 서버가 필요합니다. 포함된 Sites 템플릿만 정적으로 배포하면 로그인·가져오기·번역이 동작하지 않습니다.

공개 저장소는 [hyperdrivebeep/duvi](https://github.com/hyperdrivebeep/duvi)입니다.
