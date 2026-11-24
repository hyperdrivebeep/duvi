// Illustrative learning state for the dev preview only. Not a learner's record.
const named = (data, name) => data.concepts.find(concept => concept.name === name);
const lectureOf = (data, name) => named(data, name).resources.map(id => data.resources.find(resource => resource.id === id)).find(resource => resource.lectureId);

export const fixtureLectureId = data => lectureOf(data, '연쇄법칙(합성함수의 미분)').lectureId;

export function fixtureState(data) {
  const done = ['변수·수직선', '함수와 그래프', '연쇄법칙(합성함수의 미분)', '미분계수·도함수'].map(name => lectureOf(data, name));
  const record = (name, question, explanation = '') => ({anchor: {lectureId: lectureOf(data, name).lectureId, seconds: 60, sourceText: 'example'}, question, explanation});
  return {
    progress: Object.fromEntries(done.map(resource => [resource.id, {completed: true}])),
    records: [
      record('연쇄법칙(합성함수의 미분)', '왜 기울기를 곱하지?'),
      record('변수·수직선', '변수와 값은 어떻게 달라?', '변수는 값을 담는 이름이다.'),
      record('미분계수·도함수', '접선 기울기가 왜 변화율이야?'),
    ],
    attempts: [
      {conceptId: named(data, '연쇄법칙(합성함수의 미분)').id, correct: true},
      {conceptId: named(data, '연쇄법칙(합성함수의 미분)').id, correct: false},
    ],
  };
}

export const fixtureEvidence = data => ({[named(data, '시드와 재현성').id]: {commits: 1, testsPassed: 1, testsFailed: 1}});
