pipeline {
  agent any  // 顶级必须有 agent 配置

  environment {
    DEPLOY_DIR = '/u01/nodejs-jenkins-demo'
    NODEJS_NAME = 'NodeJs 16.20.2'
    PORT = 3300
    APP_ENTRY = 'app.js'
  }

  // 所有 stage 必须包裹在 stages 块内（核心修复点）
  stages {
    stage('拉取代码') {
      steps {  // stage 内必须有 steps 块
        echo '📥 开始拉取代码...'
        git url: 'https://github.com/bcgbsh/nodejs-jenkins-demo.git',
            branch: 'main',
            credentialsId: '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'
      }
    }

    stage('安装依赖') {
      steps {
        echo '📦 安装项目依赖...'
        nodejs(nodeJSInstallationName: env.NODEJS_NAME) {
          sh 'npm install --production'
        }
      }
    }

    stage('清理旧服务') {
      steps {
        echo '🛑 停止旧的 Node.js 服务并释放端口...'
        sh """
          # 杀死占用端口 ${PORT} 的进程
          PID=\$(lsof -ti:${PORT} || echo "none")
          if [ "\$PID" != "none" ]; then
            echo "杀死占用 ${PORT} 端口的进程：\$PID"
            kill -9 \$PID
            sleep 2
          else
            echo "${PORT} 端口未被占用"
          fi

          # 杀死旧的 node app.js 进程
          OLD_PID=\$(ps -ef | grep -v grep | grep "node ${APP_ENTRY}" | awk '{print \$2}' || echo "none")
          if [ "\$OLD_PID" != "none" ]; then
            echo "杀死旧服务进程：\$OLD_PID"
            kill -9 \$OLD_PID
            sleep 2
          fi
        """
      }
    }

    stage('部署代码') {
      steps {
        echo '🚀 部署新代码到服务器...'
        sh """
          mkdir -p ${DEPLOY_DIR}
          # 备份旧日志
          cp ${DEPLOY_DIR}/app.log ${DEPLOY_DIR}/app.log.bak 2>/dev/null || true
          # 清空新日志
          > ${DEPLOY_DIR}/app.log
          # 复制代码
          cp -r ./* ${DEPLOY_DIR}/
          # 设置权限
          chmod -R 755 ${DEPLOY_DIR}
          chown -R root:root ${DEPLOY_DIR}
        """
      }
    }

    stage('启动新服务') {
      steps {  // 此步骤是修复核心：stage 内必须有 steps 包裹
        echo '🔄 启动新的 Node.js 服务...'
        nodejs(nodeJSInstallationName: env.NODEJS_NAME) {
          sh """
            echo "📋 当前执行用户信息："
            whoami  # 显示当前用户名（如 jenkins、root）
            echo "当前用户 ID 和所属组："
            id     # 显示 uid、gid、所属组列表（详细信息）
            echo "当前工作目录："
            pwd    # 辅助确认执行路径
            echo "=============================================="
            cd ${DEPLOY_DIR}
            # 强制杀死残留进程
            pkill -f "node ${APP_ENTRY}" 2>/dev/null || true
            sleep 1
            # 启动服务
            nohup node ${APP_ENTRY} > app.log 2>&1 &
            START_PID=\$!
            echo "服务启动命令 PID：\$START_PID" >> ${DEPLOY_DIR}/app.log
            sleep 5

            # 检测进程是否存活
            CURRENT_PID=\$(ps -ef | grep -v grep | grep "node ${APP_ENTRY}" | awk '{print \$2}' | head -1 || echo "none")
            if [ "\$CURRENT_PID" = "none" ]; then
              echo "❌ 服务进程未启动！启动日志："
              cat ${DEPLOY_DIR}/app.log
              exit 1
            fi
            echo "✅ 服务进程已启动，PID：\$CURRENT_PID"
            ps -ef | grep -v grep | grep "node ${APP_ENTRY}"

            # 检测端口是否监听
            PORT_LISTEN=\$(ss -tulpn | grep ":${PORT}" | grep "node" || echo "none")
            if [ "\$PORT_LISTEN" = "none" ]; then
              echo "❌ 服务未监听 ${PORT} 端口！启动日志："
              cat ${DEPLOY_DIR}/app.log
              exit 1
            fi
            echo "✅ ${PORT} 端口已被 node 进程监听："
            ss -tulpn | grep ":${PORT}"

            # 检测服务是否可访问
            HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT})
            if [ "\$HTTP_CODE" = "200" ] || [ "\$HTTP_CODE" = "301" ] || [ "\$HTTP_CODE" = "302" ]; then
              echo "✅ 服务可正常访问，HTTP 状态码：\$HTTP_CODE"
            else
              echo "⚠️ 服务进程启动但访问失败，状态码：\$HTTP_CODE"
              echo "启动日志："
              cat ${DEPLOY_DIR}/app.log
              # exit 1  // 可选：非关键服务可注释
            fi
          """
        }
      }
    }
  }

  // post 块在 stages 外、pipeline 内（层级正确）
  post {
    success {
      echo "✅ 部署成功！访问地址: http://服务器IP:${PORT}"
      sh "ps -ef | grep -v grep | grep 'node ${APP_ENTRY}'"
    }
    failure {
      echo '❌ 部署失败，请检查日志！'
      sh "cat ${DEPLOY_DIR}/app.log || echo '日志文件不存在'"
    }
  }
}
