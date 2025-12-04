pipeline {
  agent any  

  environment {
    DEPLOY_DIR = '/u01/nodejs-jenkins-demo'
    NODEJS_NAME = 'NodeJs 16.20.2'
    PORT = 3300
    APP_ENTRY = 'app.js'
    SERVICE_NAME = 'nodejs-jenkins-demo' // 系统服务名
    TEST_PORT = 3301 // 测试专用端口（避免和生产端口冲突）
  }

  stages {
    stage('拉取代码') {
      steps {  
        echo '📥 开始拉取代码...'
        git url: 'https://github.com/bcgbsh/nodejs-jenkins-demo.git',
            branch: 'main',
            credentialsId: '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'
      }
    }

    stage('安装依赖') {
      steps {
        echo '📦 安装项目依赖（含测试依赖）...'
        nodejs(nodeJSInstallationName: env.NODEJS_NAME) {
          // 注意：移除 --production，安装所有依赖（含devDependencies中的Jest）
          sh 'npm install'
        }
      }
    }

    // ========== 新增：自动化测试阶段 ==========
    stage('自动化测试') {
      steps {
        echo '🧪 执行 Node.js 服务自动化测试...'
        nodejs(nodeJSInstallationName: env.NODEJS_NAME) {
          sh '''
            echo "📌 开始执行 Jest 测试（Node.js 版本：$(node -v)）"
            echo "📌 测试专用端口：${TEST_PORT}"
            
            # 1. 执行 Jest 测试（适配 Node 16，单进程运行）
            npm test -- --runInBand --no-cache
            
            # 2. 测试失败则直接终止部署（Jest 非0退出码会触发Pipeline失败）
            if [ $? -ne 0 ]; then
              echo "❌ 自动化测试失败，终止部署流程！"
              exit 1
            fi
            
            echo "✅ 所有自动化测试用例执行通过！"
          '''
        }
      }
      // 测试失败时直接终止Pipeline，不进入后续部署阶段
      post {
        failure {
          echo '❌ 自动化测试失败，部署流程终止！'
          sh 'echo "测试失败时间：$(date)" >> test-fail.log'
        }
      }
    }
    // ========== 新增结束 ==========

    stage('清理旧服务') {
      steps {
        echo '🛑 停止旧的 Node.js 服务并释放端口...'
        sh '''
          # 1. 停止 systemd 管理的旧服务
          echo "停止 ${SERVICE_NAME} 系统服务..."
          systemctl stop ''' + env.SERVICE_NAME + ''' 2>/dev/null || echo "系统服务未运行"
          
          # 2. 杀死占用端口的残留进程（兜底）
          PID=$(lsof -ti:''' + env.PORT + ''' || echo "none")
          if [ "$PID" != "none" ] && [ -n "$PID" ]; then
            echo "杀死占用 ''' + env.PORT + ''' 端口的进程：$PID"
            kill -9 $PID
            sleep 2
          else
            echo "''' + env.PORT + ''' 端口未被占用"
          fi

          # 3. 杀死旧服务进程（兜底）
          OLD_PID=$(ps -ef | grep -v grep | grep "node ''' + env.APP_ENTRY + '''" | awk \'{print $2}\' | tr -d \' \' || echo "none")
          if [ "$OLD_PID" != "none" ] && [ -n "$OLD_PID" ] && [[ "$OLD_PID" =~ ^[0-9]+$ ]]; then
            echo "杀死旧服务进程：$OLD_PID"
            kill -9 $OLD_PID
            sleep 2
          else
            echo "无旧的 node ''' + env.APP_ENTRY + ''' 服务进程需要停止"
          fi
        '''
      }
    }

    stage('部署代码') {
      steps {
        echo '🚀 部署新代码到服务器...'
        sh '''
          mkdir -p ''' + env.DEPLOY_DIR + '''
          # 备份旧日志
          cp ''' + env.DEPLOY_DIR + '''/app.log ''' + env.DEPLOY_DIR + '''/app.log.bak 2>/dev/null || true
          # 清空新日志
          > ''' + env.DEPLOY_DIR + '''/app.log
          # 复制代码（覆盖原有文件）
          cp -r ./* ''' + env.DEPLOY_DIR + '''/
          # 设置权限（适配 systemd 中 root 用户运行）
          chmod -R 755 ''' + env.DEPLOY_DIR + '''
          chown -R root:root ''' + env.DEPLOY_DIR + '''
        '''
      }
    }

    stage('启动新服务') {
      steps {  
        echo '🔄 通过 systemctl 启动新的 Node.js 服务...'
        nodejs(nodeJSInstallationName: env.NODEJS_NAME) {
          sh '''
            echo "📋 当前执行用户信息："
            whoami
            echo "当前用户 ID 和所属组："
            id
            echo "当前工作目录："
            pwd
            echo "=============================================="
            
            # 1. 进入部署目录
            cd ''' + env.DEPLOY_DIR + '''
            
            # 2. 重载 systemd 配置（防止服务文件修改）
            echo "重载 systemd 配置..."
            systemctl daemon-reload
            
            # 3. 启动系统服务
            echo "启动 ${SERVICE_NAME} 服务..."
            systemctl start ''' + env.SERVICE_NAME + '''
            
            # 4. 检查服务启动状态
            if ! systemctl is-active --quiet ''' + env.SERVICE_NAME + '''; then
              echo "❌ 服务启动失败！查看 systemd 日志："
              journalctl -u ''' + env.SERVICE_NAME + ''' -n 50
              exit 1
            fi
            echo "✅ 服务启动成功，状态：active(running)"
            
            # 5. 检测端口是否监听
            sleep 3 # 等待服务完全启动
            PORT_LISTEN=$(ss -tulpn | grep ":''' + env.PORT + '''" | grep "node" || echo "none")
            if [ "$PORT_LISTEN" = "none" ]; then
              echo "❌ 服务未监听 ''' + env.PORT + ''' 端口！查看应用日志："
              cat ''' + env.DEPLOY_DIR + '''/app.log
              exit 1
            fi
            echo "✅ ''' + env.PORT + ''' 端口已被 node 进程监听："
            ss -tulpn | grep ":''' + env.PORT + '''"

            # 6. 检测服务是否可访问
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:''' + env.PORT + ''')
            if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
              echo "✅ 服务可正常访问，HTTP 状态码：$HTTP_CODE"
            else
              echo "⚠️ 服务进程启动但访问失败，状态码：$HTTP_CODE"
              echo "应用日志："
              cat ''' + env.DEPLOY_DIR + '''/app.log
              # exit 1  // 可选：非关键服务可注释
            fi
          '''
        }
      }
    }
  }

  post {
    success {
      echo "✅ 部署成功！访问地址: http://服务器IP:${env.PORT}"
      sh '''
        echo "当前服务状态："
        systemctl status ''' + env.SERVICE_NAME + ''' --no-pager
        echo "当前进程列表："
        ps -ef | grep -v grep | grep "node ''' + env.APP_ENTRY + '''"
      '''
    }
    failure {
      echo '❌ 部署失败，请检查日志！'
      sh '''
        echo "systemd 服务日志："
        journalctl -u ''' + env.SERVICE_NAME + ''' -n 50 --no-pager
        echo "应用日志："
        cat ''' + env.DEPLOY_DIR + '''/app.log || echo "日志文件不存在"
      '''
    }
  }
}
