// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
contract Demo1 is Initializable{
    uint256 public value;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(){
        _disableInitializers();
    }

    // 初始化过后再不能初始化
    function initialize() public initializer {
        value = 10;
    }
    function add(uint256 _value) public returns (uint256) {
        value = _value + 1;
        return value;
    }


}


contract Demo2 is Initializable{
    uint256 public value;
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(){
        _disableInitializers();
    }
    // 再次部署初始化是无效的
    function initialize() public initializer {
        value = 1000;
    }
    function add(uint256 _value) public returns (uint256) {
        value = _value + 10;
        return value;
    }

    function mul(uint256 _value) public returns (uint256) {
        value = _value + 111;
        return value;
    }
}
