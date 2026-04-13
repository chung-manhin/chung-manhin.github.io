
## 学习目标

- 把 ROS1 的小乌龟速度控制例子改成 ROS 2 Jazzy
- 在 WSL 里完成编译、运行和调试
- 记录这次遇到的问题和解决过程，方便以后少踩坑

## 核心概念

### ROS1 和 ROS2 的区别

这次一开始最大的坑，其实不是代码，而是思路还停留在 ROS1。

ROS1 里常见的是这些东西：

- `catkin_ws`
- `catkin_make`
- `roscore`
- `rosrun`
- `devel/setup.bash`

到了 ROS 2 Jazzy，就变成了：

- `ros2_ws`
- `colcon build`
- 不需要单独启动 `roscore`
- `ros2 run`
- `install/setup.bash`

也就是说，这次不是简单把几个 API 改掉就完了，而是整个工作流都要跟着换。

### WSL 里的问题很多时候不是代码问题

这次最深的感受就是：

**在 WSL 里跑 ROS 2，很多看起来像代码写错了的问题，最后其实都是环境问题。**

比如这次遇到的情况：

- `gedit` 没装，导致文件根本没写成功
- 文件名输错，多了一个中文标点
- 新终端没 `source`，结果 `ros2` 命令都找不到
- 节点一直在发消息，但小乌龟就是不动
- `ros2 topic list` 卡住或者超时
- 改完配置以后，没有重启 WSL，旧状态还在

这些问题单看都不算大，但叠在一起就很折腾。

## 实践练习

### 1. 创建工作空间和功能包

先创建 ROS 2 工作空间和功能包：

```bash
mkdir -p ~/ros2_ws/src
cd ~/ros2_ws/src
source /opt/ros/jazzy/setup.bash
ros2 pkg create --build-type ament_cmake --license Apache-2.0 turtle_control_cpp --dependencies rclcpp geometry_msgs turtlesim
```

### 2. 编写发布器源码

因为 WSL 里没装 `gedit`，所以我后来直接改用 `nano`：

```bash
mkdir -p ~/ros2_ws/src/turtle_control_cpp/src
nano ~/ros2_ws/src/turtle_control_cpp/src/turtle_publisher.cpp
```

代码核心逻辑就是持续向 `/turtle1/cmd_vel` 发布速度消息，让小乌龟移动。

### 3. 编译工程

```bash
cd ~/ros2_ws
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
```

### 4. 运行程序

终端 1 运行 turtlesim：

```bash
source /opt/ros/jazzy/setup.bash
ros2 run turtlesim turtlesim_node
```

终端 2 运行自己的发布器节点：

```bash
source /opt/ros/jazzy/setup.bash
cd ~/ros2_ws
source install/setup.bash
ros2 run turtle_control_cpp turtle_publisher_cpp
```

## 遇到的问题

### 1. `gedit` 不存在

一开始我想直接用：

```bash
gedit turtle_publisher.cpp
```

结果提示没装 `gedit`。

这个问题表面上很小，但实际上后面会连带出一个更麻烦的问题：  
**我以为文件已经创建好了，其实根本没有。**

后来为了省事，直接改用 `nano`，反而更稳。

### 2. 编译时报错，找不到源码文件

后面编译的时候，报错说找不到：

```text
src/turtle_publisher.cpp
```

这个错误当时看着像 CMake 配置有问题，但实际原因很朴素：

- 文件可能根本没创建成功
- 文件没放到 `src/` 目录
- 文件名可能写错了

后来检查目录的时候，发现确实有问题。

### 3. 文件名里多了一个中文顿号

最离谱的是，目录里后来出现了两个文件：

- `turtle_publisher.cpp`
- `turtle_publisher.cpp、`

也就是说，保存文件的时候，末尾不小心多打了一个中文顿号。

这个问题特别隐蔽，因为肉眼一看很像同一个文件，但 CMake 认的是严格路径，所以当然找不到。

最后把错误文件删掉，只保留正确的那个，编译问题才解决。

### 4. 程序一直刷日志，看起来像死循环

程序跑起来以后，终端一直在刷：

```text
[INFO] ... Publishing: linear.x=0.50, angular.z=0.20
```

刚开始会觉得是不是死循环了，或者程序卡住了。

后来才反应过来，这其实是正常现象。因为这个节点本来就是定时发布速度消息，只要节点没停，它就会一直发，所以日志也会一直刷。

这个问题本身不是 bug，只是第一次看到的时候容易误判。

### 5. 新终端里 `ros2: command not found`

后面为了查话题信息，我又新开了一个终端，结果一运行 `ros2` 就报：

```text
ros2: command not found
```

这个问题的原因也不复杂，就是新终端没有加载 ROS 2 环境。

后来养成了习惯：

**每开一个新终端，先 source。**

```bash
source /opt/ros/jazzy/setup.bash
cd ~/ros2_ws
source install/setup.bash
```

这个真的很重要，不然很多问题会显得特别莫名其妙。

### 6. 节点在发消息，但小乌龟不动

这是中间最让人怀疑人生的一步。

现象是这样的：

- 我的节点一直在打印发布日志
- 说明它确实在运行
- 但是 turtlesim 窗口里的小乌龟完全不动

这时候第一反应当然是：是不是我代码写错了。

但为了排除这个可能，我又去试了官方自带的键盘控制：

```bash
ros2 run turtlesim turtle_teleop_key
```

结果一开始连这个都不动。

到这里基本就能判断了：

**问题不在我写的发布器代码，而是在环境。**

### 7. `ros2 topic list` 卡住或者超时

继续往下查的时候，`ros2 topic list -t` 也不正常，有时候直接卡住，有时候超时。

这一步其实就更说明问题了。因为如果连 ROS 2 的基础 CLI 查询都不正常，那就不是“某一个节点写错了”这么简单，而是整个 ROS 2 运行环境在 WSL 里状态不对。

### 8. 最后发现问题出在 WSL 状态

前面排查了很多，包括环境变量、终端、通信状态之类的，最后真正有效的办法其实很简单：

在 PowerShell 里执行：

```powershell
wsl --shutdown
```

然后重新打开 Ubuntu，再重新跑 turtlesim 和 teleop，就恢复正常了。

也就是说，前面很多奇怪现象，很可能都是因为 WSL 之前的运行状态没有清干净。

## 解决过程

这次最后能跑通，主要是靠下面这几步。

### 第一步：确认源码文件真的存在

重点检查：

- 文件是不是确实创建成功了
- 文件名是不是写对了
- 路径是不是在 `src/turtle_publisher.cpp`

### 第二步：别依赖 `gedit`

在 WSL 里，用 `nano` 更直接，也少很多额外问题。

```bash
nano ~/ros2_ws/src/turtle_control_cpp/src/turtle_publisher.cpp
```

### 第三步：每个终端都重新 `source`

后来我基本是固定这样用：

```bash
source /opt/ros/jazzy/setup.bash
cd ~/ros2_ws
source install/setup.bash
```

### 第四步：先怀疑环境，不要一上来就怀疑代码

当出现这些现象时：

- 节点一直打印日志，但乌龟不动
- `ros2` 命令用不了
- `ros2 topic list` 卡住
- 官方 teleop 也不工作

这时候就该优先怀疑环境，而不是继续硬改代码。

### 第五步：直接重启 WSL

最后真正解决问题的是：

```powershell
wsl --shutdown
```

然后重新打开 Ubuntu。

这一步做完以后，系统状态清掉了，之前那种“看起来什么都对，但就是不正常”的情况也就没了。

## 总结

这次最大的收获，不是学会了怎么写一个发布器节点，而是更清楚地认识到：

**在 WSL 里跑 ROS 2，代码问题往往没有环境问题多。**

这次踩过的坑，归纳起来主要有这几个：

- 编辑器没装，导致文件没真正写进去
- 文件名带了中文标点，路径对不上
- 新终端忘了 `source`
- 节点看起来正常，但通信环境其实不正常
- WSL 状态异常，导致 ROS 2 的行为很怪
- 最后靠 `wsl --shutdown` 才彻底恢复

所以以后如果再遇到类似情况，我会优先检查下面这些：

- 文件是不是真的存在
- 文件名对不对
- 当前终端有没有 `source`
- 是不是环境问题而不是代码问题
- WSL 要不要直接重启

这次最想给未来的自己留的一句话就是：

**如果你在 WSL 里折腾 ROS 2 半天都觉得哪儿都不对，先别急着改代码，直接试试 `wsl --shutdown`。**