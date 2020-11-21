import md5 from "md5";

export function verifyChecksum(checksum, data) {
  return md5(data) === checksum;
}