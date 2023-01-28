const snarkjs = require("snarkjs");
const params = {
  pubKeyX: 5667974128672329494437039581755896375861905929310397415234894883508838063134n,
  pubKeyY: 2593627226238551346388740194249599576596738764266592363117800938370265791410n,
  R8x: 13828306721111752079062276346632169976796604849859857306322629641359520130912n,
  R8y: 12231362695645765782588018496727028944711211434767789872119797019150304278002n,
  S: 2578503368678037069630456701376536975146417485004009163014246535677695004981n,
  signedLeaf: 13906827554246231219325858456829444778059843423508322844443754435318341423803n,
  newLeaf: 21541122778668866935059576308971664479706982915057114400069391324849692980898n,
  signedLeafSecret: 9001603325174198369572179425078700555105305509349038532466602062937181091436n,
  newLeafSecret: 15530807709269554253496393594069401699311238364234836762975083481780509173746n,
  iat: 3883852309n,
  customFields: [ 123456769n, 987654321n ],
  scope: 0n
}
async function run() {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(params, "https://preproc-zkp.s3.us-east-2.amazonaws.com/circom/onAddLeaf_js/onAddLeaf.wasm", "https://preproc-zkp.s3.us-east-2.amazonaws.com/circom/onAddLeaf_0001.zkey");
  console.log(proof, publicSignals)
}
run()
