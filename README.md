# solidity 合约升级系列 

# proxy原理

## 代理合约

solidity语言中，由于合约部署后合约是无法修改的。如果出现重大bug可能造成严重的资产损失。

## 图示代理合约原理

- caller：用户调用合约
- proxy：代理合约
- logic：逻辑合约（正常的业务逻辑）

用户调用本质上是调用`msg.sender` -> `Caller contract-call(函数字节码)` -> `Proxy-dalegatecall(委托调用)` -> `logic合约`
![imagepng](https://cdn.nlark.com/yuque/0/2023/png/1229786/1675310464237-a7322499-77d4-476f-b576-95e7b427cdfe.png#averageHue=%23f6f6f6&clientId=uc6b4dce4-c2c6-4&from=paste&height=570&id=ufd6424a4&name=image.png&originHeight=570&originWidth=1858&originalType=binary&ratio=1&rotation=0&showTitle=false&size=68599&status=done&style=none&taskId=u579c159c-e768-4c6f-9c64-eb121897acb&title=&width=1858)

## 代理合约代码

根据原理可以分析出可代理合约的部署流程为`logic`->`proxy-logicAddress > 调用下callData 通过data字节码 0xd09de08a`->`caller-proxyAddress`。
第二步调用调用callData目的是把设置委托代理地址，否则caller代理地址为address(0);
![imagepng](https://cdn.nlark.com/yuque/0/2023/png/1229786/1675311179738-e97cfb35-d846-4b40-99de-e070e27fd98e.png#averageHue=%232e2f42&clientId=ud669e988-5241-4&from=paste&height=99&id=uf527db64&name=image.png&originHeight=115&originWidth=308&originalType=binary&ratio=1&rotation=0&showTitle=false&size=8505&status=done&style=none&taskId=ue5bfdb96-058a-4813-b2cf-b299c4d8fdb&title=&width=265)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

// 代理合约
contract Proxy {
    address public implementation; // 逻辑合约地址。implementation合约同一个位置的状态变量类型必须和Proxy合约的相同，不然会报错。

    /**
     * @dev 初始化逻辑合约地址
     */
    constructor(address implementation_) {
        implementation = implementation_;
    }
    receive() external payable {}
    /**
     * @dev 回调函数，将本合约的调用委托给 `implementation` 合约
     * 通过assembly，让回调函数也能有返回值
     */
    fallback() external payable {
        address _implementation = implementation;
        assembly {
            // 将msg.data拷贝到内存里
            // calldatacopy操作码的参数: 内存起始位置，calldata起始位置，calldata长度
            calldatacopy(0, 0, calldatasize())

            // 利用delegatecall调用implementation合约
            // delegatecall操作码的参数：gas, 目标合约地址，input mem起始位置，input mem长度，output area mem起始位置，output area mem长度
            // output area起始位置和长度位置，所以设为0
            // delegatecall成功返回1，失败返回0
            let result := delegatecall(
                gas(),
                _implementation,
                0,
                calldatasize(),
                0,
                0
            )

            // 将return data拷贝到内存
            // returndata操作码的参数：内存起始位置，returndata起始位置，returndata长度
            returndatacopy(0, 0, returndatasize())

            switch result
            // 如果delegate call失败，revert
            case 0 {
                revert(0, returndatasize())
            }
            // 如果delegate call成功，返回mem起始位置为0，长度为returndatasize()的数据（格式为bytes）
            default {
                return(0, returndatasize())
            }
        }
    }
}


// 逻辑合约，执行被委托的调用
contract Logic {
    address public implementation; // 与Proxy保持一致，防止插槽冲突
    uint public x = 99; 
    event CallSuccess(); // 调用成功事件

    // 这个函数会释放CallSuccess事件并返回一个uint。
    // 函数selector: 0xd09de08a
    function increment() external returns(uint) {
        emit CallSuccess();
        return x + 1;
    }
}
//  调用示例
contract Caller{
    address public proxy; // 代理合约地址

    constructor(address proxy_){
        proxy = proxy_;
    }

    // 通过代理合约调用increment()函数
    function increment() external returns(uint) {
        ( , bytes memory data) = proxy.call(abi.encodeWithSignature("increment()"));
        return abi.decode(data,(uint));
    }
}
```

## 合约升级

由于合约部署后是不可修改的，但是一个上线的项目在部署后发现严重漏洞后代码无法升级是非常严重的后果，因此有了代理合约。
代理合约通常使用代理模式来实现。这种工作原理存在两个合约。一个代理合约一个实现功能的逻辑合约。用户通过调用代理合约`delagateccall`来达到升级目的。

- 代理合约：负责管理合约状态数据。
  
- 逻辑合约：负责业务逻辑。
  
  ## 实现方式
  
  目前通用的代理合约是透明代理和UUPS代理。他们的目的都是为了`在合约地址不变的情况下，把旧逻辑合约代码改为新逻辑合约代码`。他们的不同点是
  
- 透明合约：是把更新内容合约函数放在代理合约里。
  
- UUPS：是把更新代码合约放在实现合约里。
  
  ## 透明合约
  
  透明代理使用[EIP1967](https://eips.ethereum.org/EIPS/eip-1967)
  透明代理中设置了一个管理员地址，每次调用的时候合约会判断`msg.sender`是管理员还是普通用户，管理员的话走委托合约，如果是用户调用即使`代理合约和逻辑合约有相同选择器`也会把委托地址给逻辑合约调用，即。需要注意的是`管理员只能调用委托合约无法待用逻辑合约`。
  存在问题：每次调用都会先调用代理合约，判断是否为管理员，然后再去掉逻辑合约，所以会比较费gas。
  
- 管理员合约：管理员
  
- 逻辑合约：业务逻辑
  
- 代理合约：代理合约
  

对外暴露的其实真正的就是代理合约的地址。原理请看[代理合约原理](https://www.yuque.com/qdwds/usofdz/wp844kav2p93ztv0)。
![imagepng](https://cdn.nlark.com/yuque/0/2023/png/1229786/1676427777267-ad5175ec-2a5b-4c51-b698-553ce5376244.png#averageHue=%23292d30&clientId=u62c79ee6-26a3-4&from=paste&height=152&id=u6c9e6ad3&name=image.png&originHeight=259&originWidth=428&originalType=binary&ratio=2.200000047683716&rotation=0&showTitle=false&size=40719&status=done&style=none&taskId=u5abe150f-4853-4074-86dd-53d344b749b&title=&width=250.54544067382812)

## UUPS合约

UUPS使用[EIP1822](https://eips.ethereum.org/EIPS/eip-1822)
UUPS 不使用管理员地址。UUPS 代理依赖于[_authorizeUpgrade](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable-_authorizeUpgrade-address-)函数被覆盖的功能以包括对升级机制的访问限制。
在UUPS中，不管管理员还是用户，所有调用都倍发送到逻辑合约中。因此在实现逻辑合约时候，需要根据自己的需求定制功能。
存在问题：`upgradeTo`函数实现于逻辑合约中，会增加不少代码。如果开发中忘记添加这个函数，合约将不能升级。

## hardhat upgrades

使用hardhat部署可升级合约，默认是`透明代理`，如果想要其他代理需要自行设置[harhdat upgrades config](https://docs.openzeppelin.com/upgrades-plugins/1.x/api-hardhat-upgrades)。
在[openzeeplin](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--)中，首次部署可升级合约需要在constructor中调用`**_disableInitializers**`函数，主要作用就死锁定合约，防止将来重新初始化。作为对合约中的一些保护。 [点击详情](https://forum.openzeppelin.com/t/what-does-disableinitializers-function-mean/28730)

## 必要知识点

- _disableInitializers：构造函数内使用，在逻辑合约的上下文出`锁定初始化程序(initializer)`，防止别人调用`initialize`函数攻击。代理合约仍然能调用该函数。
- `initializ:`
- constuctor：文档中看到可升级合约中，不能有构造函数，否则可能会造成错误。其实说的是可升级合约中不能有任何`可变数据`的构造函数出现，这样是不安全的。所以需要有`/// @custom:oz-upgrades-unsafe-allow constructor`
- 升级上限：可约升级的最大上线是_initialized`uint8(255)`次，如果需要多次升级建议重写。
  
  ## 透明代理实现
  
  [透明代理实现](https://www.yuque.com/qdwds/usofdz/gxggl7dfwn5algh6)
  
  ## UUPS实现
  
  [UUPS代理实现](https://www.yuque.com/qdwds/usofdz/vrd94bym8ia6sak7)


笔记文档：[区块链笔记](https://www.yuque.com/qdwds)\
博客地址：[https://blog.qdwds.cn](https://blog.qdwds.cn)\
哔哩哔哩：[视频合集](https://space.bilibili.com/449244768?spm_id_from=333.1007.0.0)\
支持一下：0x0168996F9355fDf6Ba4b7E25Cc4f16Fd6AB9361c

感谢作者
[https://blog.csdn.net/pulong0748/article/details/127707167](https://blog.csdn.net/pulong0748/article/details/127707167)
[https://abhik.hashnode.dev/6-nuances-of-using-upgradeable-smart-contracts#heading-1-uups-vs-transparent](https://abhik.hashnode.dev/6-nuances-of-using-upgradeable-smart-contracts#heading-1-uups-vs-transparent)