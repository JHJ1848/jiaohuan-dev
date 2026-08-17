#!/usr/bin/env bash
set -euo pipefail

url=''
method='GET'
data_file=''
expected_status='200'
expected_text=''
declare -a headers=()
declare -a secret_headers=()

usage() {
  cat <<'USAGE'
用法：
  http-check.sh --url <URL> [--method GET|POST] [--data-file <文件>] \
    [--header 'Name: value'] [--secret-header 'Name=ENV_NAME'] \
    [--expect-status 200] [--expect-contains '关键字段']

敏感请求头只通过 --secret-header 从环境变量读取；脚本不输出响应正文。
USAGE
}

fail() {
  printf '[HTTP验证] 失败：%s\n' "$1" >&2
  exit 2
}

is_sensitive_header_name() {
  case "${1,,}" in
    authorization|proxy-authorization|cookie|x-api-key|api-key|x-auth-token|x-access-token|x-token|x-session-token|token)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

validate_public_header() {
  local header="$1"
  [[ "$header" == *:* ]] || fail '--header 格式必须是 Name: value'
  local header_name="${header%%:*}"
  header_name="${header_name//[[:space:]]/}"
  [[ -n "$header_name" ]] || fail '--header 缺少请求头名称'
  if is_sensitive_header_name "$header_name"; then
    fail "敏感请求头 $header_name 必须使用 --secret-header"
  fi
}

while (($# > 0)); do
  case "$1" in
    --url|--method|--data-file|--header|--secret-header|--expect-status|--expect-contains)
      (($# >= 2)) || fail "$1 缺少取值"
      case "$1" in
        --url) url="$2" ;;
        --method) method="$2" ;;
        --data-file) data_file="$2" ;;
        --header) headers+=("$2") ;;
        --secret-header) secret_headers+=("$2") ;;
        --expect-status) expected_status="$2" ;;
        --expect-contains) expected_text="$2" ;;
      esac
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

[[ -n "$url" ]] || fail '必须提供 --url'
[[ "$method" =~ ^[A-Za-z]+$ ]] || fail '--method 不是有效 HTTP 方法'
[[ "$expected_status" =~ ^[0-9]{3}$ ]] || fail '--expect-status 必须是三位状态码'
if [[ -n "$data_file" && ! -f "$data_file" ]]; then
  fail "请求体文件不存在：$data_file"
fi

response_file="$(mktemp "${TMPDIR:-/tmp}/jiaohuan-http.XXXXXX")"
trap 'rm -f "$response_file"' EXIT

curl_args=(--silent --show-error --request "$method" --url "$url" --output "$response_file" --write-out '%{http_code}')
if [[ -n "$data_file" ]]; then
  curl_args+=(--data-binary "@$data_file")
fi
for header in "${headers[@]}"; do
  validate_public_header "$header"
  curl_args+=(--header "$header")
done
for secret_header in "${secret_headers[@]}"; do
  header_name="${secret_header%%=*}"
  env_name="${secret_header#*=}"
  [[ "$header_name" != "$secret_header" && -n "$header_name" && -n "$env_name" ]] || fail '--secret-header 格式必须是 Name=ENV_NAME'
  [[ "$env_name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || fail '--secret-header 的环境变量名无效'
  [[ -n "${!env_name:-}" ]] || fail "未提供非空环境变量：$env_name"
  curl_args+=(--header "$header_name: ${!env_name}")
done

curl_exit=0
http_status="$(curl "${curl_args[@]}")" || curl_exit=$?
if ((curl_exit != 0)); then
  printf '[HTTP验证] 传输失败：curl_exit=%s\n' "$curl_exit" >&2
  exit "$curl_exit"
fi
if [[ "$http_status" != "$expected_status" ]]; then
  printf '[HTTP验证] 状态失败：expected=%s actual=%s\n' "$expected_status" "$http_status" >&2
  exit 1
fi
if [[ -n "$expected_text" ]] && ! grep -Fq -- "$expected_text" "$response_file"; then
  printf '[HTTP验证] 断言失败：未找到期望字段\n' >&2
  exit 1
fi

if [[ -n "$expected_text" ]]; then
  printf '[HTTP验证] 通过：status=%s assertion=pass\n' "$http_status"
else
  printf '[HTTP验证] 通过：status=%s\n' "$http_status"
fi
