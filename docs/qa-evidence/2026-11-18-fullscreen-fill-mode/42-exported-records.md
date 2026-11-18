# Duvi 학습 기록 모음

내보낸 시각: 2026-11-17T16:54:33.613Z · 기록 5개 · 열린 질문 2개

## 영상 보기 전 예측: 신경망 학습의 핵심은 '기울기'일 것 같다

출처: 강의 yt\_VMj\-3S1tku0 · 0\.08초 · 정렬 버전 원본

원문 스냅샷: hello my name is andre and i've been training deep neural networks for a bit more than a decade and in this lecture i'd like to show you what neural network training looks like under the hood so in particular we are going to start with a blank jupiter

번역 스냅샷: 저장 없음

도움: 도움 없이

### 질문

영상 보기 전 예측: 신경망 학습의 핵심은 '기울기'일 것 같다

### 내 설명

미기록

### 관측 · 원자료 · 선택 규칙

미기록

### 가정 · 변수 · 해석

미기록

### 대안 · 측정 오류 · 구별 조건

미기록

### 실행 전 예측 · 실패 기준 · 비용

보기 전 예측: 역전파는 출력에서 입력 쪽으로 기울기를 곱해 가며 전달할 것이다\. 틀리면 영상의 어느 지점에서 다른지 적는다\.

### 실제 결과 · 코드/노트북 · seed · 한계

미기록

### 바뀐 생각 · 바꾼 증거 · 보류 이유

미기록

### 최초 설명



### 수정·복습 이력

\{
  "history": \[\],
  "reviews": \[\]
\}

### 연구 연결 (직접 확인 후 작성)

- 연결 문서 / SHA / 확인 방식: 미기록
- 해결할 실패 / 바꿀 부품·가중치·기법: 미기록
- 필요한 새 관측 / 비교군 / 기대 이득과 비용: 미기록
- 실패 조건 / 결과와 해석 / 유지가 맞는 사례: 미기록

교육용 탐색 기록입니다. 새로운 원리의 발견이나 원 실험 재현을 인증하지 않습니다.

---

## Value 객체의 grad는 왜 처음에 0인가?

출처: 강의 yt\_VMj\-3S1tku0 · 23\.985003032424927초 · 정렬 버전 원본

원문 스냅샷: notebook and by the end of this lecture we will define and train in neural net and you'll get to see everything that goes on under the hood and exactly sort of how that works on an intuitive level now specifically what i would like to do

번역 스냅샷: 저장 없음

도움: 도움 없이

### 질문

Value 객체의 grad는 왜 처음에 0인가?

### 내 설명

미기록

### 관측 · 원자료 · 선택 규칙

미기록

### 가정 · 변수 · 해석

미기록

### 대안 · 측정 오류 · 구별 조건

미기록

### 실행 전 예측 · 실패 기준 · 비용

미기록

### 실제 결과 · 코드/노트북 · seed · 한계

미기록

### 바뀐 생각 · 바꾼 증거 · 보류 이유

미기록

### 최초 설명



### 수정·복습 이력

\{
  "history": \[\],
  "reviews": \[\]
\}

### 연구 연결 (직접 확인 후 작성)

- 연결 문서 / SHA / 확인 방식: 미기록
- 해결할 실패 / 바꿀 부품·가중치·기법: 미기록
- 필요한 새 관측 / 비교군 / 기대 이득과 비용: 미기록
- 실패 조건 / 결과와 해석 / 유지가 맞는 사례: 미기록

교육용 탐색 기록입니다. 새로운 원리의 발견이나 원 실험 재현을 인증하지 않습니다.

---

## 전체화면에서: backward\(\)는 왜 출력 쪽부터 계산하나?

출처: 강의 yt\_VMj\-3S1tku0 · 71\.41500609346008초 · 정렬 버전 원본

원문 스냅샷: respect to the weights of a neural network and what that allows us to do then is we can iteratively tune the weights of that neural network to minimize the loss function and therefore improve the accuracy of the network so back propagation would be at the

번역 스냅샷: 저장 없음

도움: 도움 없이

### 질문

전체화면에서: backward\(\)는 왜 출력 쪽부터 계산하나?

### 내 설명

내 설명: 출력의 기울기를 알아야 연쇄법칙으로 앞쪽 기울기를 곱할 수 있다\.

### 관측 · 원자료 · 선택 규칙

미기록

### 가정 · 변수 · 해석

미기록

### 대안 · 측정 오류 · 구별 조건

미기록

### 실행 전 예측 · 실패 기준 · 비용

미기록

### 실제 결과 · 코드/노트북 · seed · 한계

미기록

### 바뀐 생각 · 바꾼 증거 · 보류 이유

미기록

### 최초 설명

내 설명: 출력의 기울기를 알아야 연쇄법칙으로 앞쪽 기울기를 곱할 수 있다\.

### 수정·복습 이력

\{
  "history": \[\],
  "reviews": \[\]
\}

### 연구 연결 (직접 확인 후 작성)

- 연결 문서 / SHA / 확인 방식: 미기록
- 해결할 실패 / 바꿀 부품·가중치·기법: 미기록
- 필요한 새 관측 / 비교군 / 기대 이득과 비용: 미기록
- 실패 조건 / 결과와 해석 / 유지가 맞는 사례: 미기록

교육용 탐색 기록입니다. 새로운 원리의 발견이나 원 실험 재현을 인증하지 않습니다.

---

## 전체화면에서: backward\(\)는 왜 출력 쪽부터 계산하나?

출처: 강의 yt\_VMj\-3S1tku0 · 423\.2384170476837초 · 정렬 버전 원본

원문 스냅샷: very complex piece of code and that turns out to not be the case so if we just go to micrograd and you'll see that there's only two files here in micrograd this is the actual engine it doesn't know anything about neural nuts and this is the entire

번역 스냅샷: 저장 없음

도움: 도움 없이

### 질문

전체화면에서: backward\(\)는 왜 출력 쪽부터 계산하나?

### 내 설명

내 설명: 출력의 기울기를 알아야 연쇄법칙으로 앞쪽 기울기를 곱할 수 있다\.

### 관측 · 원자료 · 선택 규칙

미기록

### 가정 · 변수 · 해석

미기록

### 대안 · 측정 오류 · 구별 조건

미기록

### 실행 전 예측 · 실패 기준 · 비용

미기록

### 실제 결과 · 코드/노트북 · seed · 한계

미기록

### 바뀐 생각 · 바꾼 증거 · 보류 이유

미기록

### 최초 설명

내 설명: 출력의 기울기를 알아야 연쇄법칙으로 앞쪽 기울기를 곱할 수 있다\.

### 수정·복습 이력

\{
  "history": \[\],
  "reviews": \[\]
\}

### 연구 연결 (직접 확인 후 작성)

- 연결 문서 / SHA / 확인 방식: 미기록
- 해결할 실패 / 바꿀 부품·가중치·기법: 미기록
- 필요한 새 관측 / 비교군 / 기대 이득과 비용: 미기록
- 실패 조건 / 결과와 해석 / 유지가 맞는 사례: 미기록

교육용 탐색 기록입니다. 새로운 원리의 발견이나 원 실험 재현을 인증하지 않습니다.

---

## 전체화면에서: backward\(\)는 왜 출력 쪽부터 계산하나?

출처: 강의 yt\_VMj\-3S1tku0 · 423\.2880341773834초 · 정렬 버전 원본

원문 스냅샷: very complex piece of code and that turns out to not be the case so if we just go to micrograd and you'll see that there's only two files here in micrograd this is the actual engine it doesn't know anything about neural nuts and this is the entire

번역 스냅샷: 저장 없음

도움: 도움 없이

### 질문

전체화면에서: backward\(\)는 왜 출력 쪽부터 계산하나?

### 내 설명

내 설명: 출력의 기울기를 알아야 연쇄법칙으로 앞쪽 기울기를 곱할 수 있다\.

### 관측 · 원자료 · 선택 규칙

미기록

### 가정 · 변수 · 해석

미기록

### 대안 · 측정 오류 · 구별 조건

미기록

### 실행 전 예측 · 실패 기준 · 비용

미기록

### 실제 결과 · 코드/노트북 · seed · 한계

미기록

### 바뀐 생각 · 바꾼 증거 · 보류 이유

미기록

### 최초 설명

내 설명: 출력의 기울기를 알아야 연쇄법칙으로 앞쪽 기울기를 곱할 수 있다\.

### 수정·복습 이력

\{
  "history": \[\],
  "reviews": \[\]
\}

### 연구 연결 (직접 확인 후 작성)

- 연결 문서 / SHA / 확인 방식: 미기록
- 해결할 실패 / 바꿀 부품·가중치·기법: 미기록
- 필요한 새 관측 / 비교군 / 기대 이득과 비용: 미기록
- 실패 조건 / 결과와 해석 / 유지가 맞는 사례: 미기록

교육용 탐색 기록입니다. 새로운 원리의 발견이나 원 실험 재현을 인증하지 않습니다.
