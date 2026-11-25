"""학습자용: 이 파일을 복사해 TODO를 구현하세요."""

from .protocol import metadata, state_hash


class Logger:
    def __init__(self, config):
        self.meta = metadata(config)
        self.previous = self.meta["config_hash"]
        self.rows = []

    def record(self, event):
        # TODO: event와 공통 필드에 다음 seq를 붙인다 (첫 줄은 1).
        # TODO: state_hash(previous, 해시 필드 없는 행)를 붙이고 previous를 갱신한다.
        # TODO: 완성된 행을 self.rows에 추가한다.
        raise NotImplementedError("starter.Logger.record: JSONL 한 행을 만드는 TODO를 구현하세요.")


def solve(config, measure, submit):
    # TODO: 허용 좌표·예측 표를 읽고, 필요한 측정을 고른다.
    # TODO: 성공으로만 후보를 거르고 일시 오류만 한 번 재시도한다.
    # TODO: 증거로 식별하면 submit(후보), 식별 불가면 submit(None).
    # 연습할 때 첫 측정을 직접 추가하면 Logger.record TODO를 먼저 확인할 수 있다.
    raise NotImplementedError("starter.solve: 측정·재시도·제출 루프의 TODO를 구현하세요.")


def diagnostics(rows):
    # TODO: 오류 반환의 seq를 근거로 [{\"seq\": ..., \"label\": ...}, ...]를 만든다.
    raise NotImplementedError("starter.diagnostics: 오류 근거 줄과 라벨을 기록하세요.")
