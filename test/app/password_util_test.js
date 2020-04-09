const { assert } = require('chai');

const passwordUtil = require('../../app/password_util');

describe('Password Util', () => {
  describe('hash generation', () => {
    it('generates the same hash for the same phrase', () => {
      const first = passwordUtil.generateHash('phrase');
      const second = passwordUtil.generateHash('phrase');
      assert.strictEqual(first, second);
    });
    it('generates different hashes for different phrases', () => {
      const first = passwordUtil.generateHash('0');
      const second = passwordUtil.generateHash('1');
      assert.notStrictEqual(first, second);
    });
  });

  describe('hash matching', () => {
    it('returns true for the same hash', () => {
      const phrase = 'phrase';
      const hash = passwordUtil.generateHash(phrase);
      assert.isTrue(passwordUtil.matchesHash(phrase, hash));
    });
    it('returns false for different hashes', () => {
      const hash = passwordUtil.generateHash('phrase');
      assert.isFalse(passwordUtil.matchesHash('phrase2', hash));
    });
  });

  describe('password validation', () => {
    it('should return nothing if password is valid', () => {
      const valid = [
        '123456',
        '1a5b3C6g',
        ')CZcy@ccHa',
        'C$D--M;Xv+',
        'X8-;!47IW|',
        'Oi74ZpoSx,p',
        '>]K1*g^swHW0]F6}{',
        'TiJf@lk^jsO^z8MUn%)[Sd~UPQ)ci9CGS@jb<^',
        '$u&%{r]apg#G@3dQdCkB_p8)gxhNFr=K&yfM_M8O&2Z.vQyvx',
        'bf^OMnYku*iX;{Piw_0zvz',
        '#'.repeat(50),
      ];
      valid.forEach((pass) => {
        assert.isNull(passwordUtil.validatePassword(pass));
      });
    });

    it('should return an error if password is not a string', () => {
      const invalid = [0, 123456, [], {}, null, undefined];
      invalid.forEach((pass) => {
        assert.strictEqual(
          passwordUtil.validatePassword(pass),
          'Password must be a string'
        );
      });
    });

    it('should return an error if password is not between 6 and 50 characters', () => {
      const invalid = ['a', 'abcde', '#'.repeat(51), '#'.repeat(100)];
      invalid.forEach((pass) => {
        assert.strictEqual(
          passwordUtil.validatePassword(pass),
          'Password must be between 6 and 50 characters long'
        );
      });
    });

    it('should return an error if password has invalid characters', () => {
      const invalid = [
        'ʍʪց3Wͪ݌bΉf',
        ')É{b)͎ÔȩҜ٣',
        'ߓܑ˿G֖=3¤)P',
        'ݴ`ԚfĬ8ӝrH(',
        'e̹ωͻܺȬۺ#dӄ',
        '谀뤼筎笟ꅅ栗塕카ꭴ',
        '俈꛷࿩迭䰡钑럭䛩銛뤙',
        '봟㉟ⓓ༭꽫㊡䶷쒨⻯颰',
        '<@ȦƘΉوۉaҋ<',
      ];
      invalid.forEach((pass) => {
        assert.strictEqual(
          passwordUtil.validatePassword(pass),
          'Password must only contain letters, numbers and symbols'
        );
      });
    });
  });
});
