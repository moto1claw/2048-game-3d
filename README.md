# 2048 3D 时空穿越 - 技术规格

## 项目架构

前后端分离：
- **前端**: Three.js 3D游戏 + Vite 构建
- **后端**: Node.js + Express

## 运行方式

```bash
# 安装依赖
cd client && npm install
cd ../server && npm install

# 启动开发服务器
# 终端1: 后端
cd server && npm start

# 终端2: 前端  
cd client && npm run dev
```

## 功能规格

### 后端 API

```
POST /api/auth/register    - 用户注册
POST /api/auth/login       - 用户登录
GET  /api/game/levels      - 获取关卡列表
POST /api/game/end         - 结束游戏保存分数
GET  /api/leaderboard      - 获取排行榜
```

### 前端 3D 特性

1. **3D 游戏场景**
   - 4x4 的立方体网格
   - 方块是带数字纹理的3D立方体
   
2. **动画效果**
   - 方块移动：平滑过渡
   - 合并：缩放弹跳动画
   - 新方块：缩放出现
   - 爆炸：缩小消失

3. **交互**
   - 键盘方向键/WASD控制
   - 手机触摸滑动
