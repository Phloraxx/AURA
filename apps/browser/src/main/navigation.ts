const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const LOCALHOST_PATTERN = /^(localhost|127(?:\.\d{1,3}){3})(:\d+)?(?:\/|$)/i;
const DOMAIN_PATTERN =
  /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}]{2,}(?::\d+)?(?:\/|$)/u;

export function normalizeAddress(input: string): string {
  const value = input.trim();

  if (value.length === 0) {
    return 'https://www.google.com/';
  }

  if (PROTOCOL_PATTERN.test(value)) {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  }

  if (LOCALHOST_PATTERN.test(value)) {
    return new URL(`http://${value}`).toString();
  }

  if (DOMAIN_PATTERN.test(value)) {
    return new URL(`https://${value}`).toString();
  }

  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}
