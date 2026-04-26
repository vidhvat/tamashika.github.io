import csv
import datetime as dt
import json
from pathlib import Path


DEFAULT_INPUT_CSV = Path(r"C:\Users\vidhv\rungun\timeline_bake")
DEFAULT_OUTPUT_JS = Path(r"timeline.json")
DATE_FORMAT = "%Y-%m-%d"
BAKE_UPPER_LIMIT_DATE: str | None = "2026-10-01"
DEFAULT_PRUNED_FLAGS = {
    "none",
}


def is_number(value: str) -> bool:
    try:
        float(value)
        return True
    except ValueError:
        return False


def build_date_flag_mapping(
    csv_path: Path, pruned_flags: set[str], upper_limit_date: str | None = None
) -> dict[str, list[str]]:
    date_to_flags: dict[str, list[str]] = {}
    parsed_upper_limit: dt.date | None = None
    if upper_limit_date:
        parsed_upper_limit = dt.datetime.strptime(upper_limit_date, DATE_FORMAT).date()

    with csv_path.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.reader(csv_file)
        for row in reader:
            if not row:
                continue

            date = row[0].strip()
            if not date:
                continue
            if parsed_upper_limit is not None:
                parsed_date = dt.datetime.strptime(date, DATE_FORMAT).date()
                if parsed_date > parsed_upper_limit:
                    continue

            flags = []
            for raw_value in row[1:]:
                value = raw_value.strip()
                if not value:
                    continue
                if is_number(value):
                    continue
                if value.casefold() in pruned_flags:
                    continue
                flags.append(value)
            if len(flags) == 0:
                continue
            date_to_flags[date] = flags

    return date_to_flags


def write_js_object(
    mapping: dict[str, list[str]], pruned_flags: set[str], output_path: Path
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    mapping_json = json.dumps(mapping, ensure_ascii=False, separators=(",", ":"))

    with output_path.open("w", encoding="utf-8") as output_file:
        output_file.write(mapping_json)


def main() -> None:
    mapping = build_date_flag_mapping(
        DEFAULT_INPUT_CSV, DEFAULT_PRUNED_FLAGS, BAKE_UPPER_LIMIT_DATE
    )
    write_js_object(mapping, DEFAULT_PRUNED_FLAGS, DEFAULT_OUTPUT_JS)
    print(
        f"Wrote JS for {len(mapping)} dates to {DEFAULT_OUTPUT_JS} "
    )


if __name__ == "__main__":
    main()
