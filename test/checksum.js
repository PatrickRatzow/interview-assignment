import { expect } from "chai";
import { verifyChecksum } from "../src/services/checksum";

describe("Checksum", () => {
  /**
   * Using http://www.md5.cz/ to verify
   * This is simply just to prove that the MD5 hashing algorithm is correct
   * If not, our system would be severely crippled, but this is more of a 'redundant' test
   */
  it("should produce correct md5 hashes", () => {
    const hash = "161bc25962da8fed6d2f59922fb642aa";
    const input = "hello there";

    const equals = verifyChecksum(hash, input);

    expect(equals).to.be.true;
  })
})