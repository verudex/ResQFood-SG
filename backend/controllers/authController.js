const { randomUUID } = require('crypto');

const mockSingpassLogin = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      token_type: 'DPoP',
      id_token_payload: {
        iss: 'https://stg-id.singpass.gov.sg',
        sub: randomUUID(),
        sub_type: 'public',
        acr: 'https://stg-id.singpass.gov.sg/loa/1',
        amr: ['pwd'],
        sub_attributes: {
          account_type: 'verified',
          identity_number: 'S5410282A',
          identity_coi: 'SG',
          name: 'Tan Wei Ming',
          email: 'weiming.tan@example.com',
          mobileno: '+6591234567',
        },
      },
    });
  } catch (error) {
    console.error(`Mock Singpass login failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error',
    });
  }
};

module.exports = { mockSingpassLogin };
