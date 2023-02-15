require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
    defaultNetwork:"localhost",
    networks:{
        localhost:{
            url:"http://localhost:8545",
        }
    }
};
