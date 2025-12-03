pipeline {
  agent any

  environment {
    DEPLOY_DIR = '/u01/nodejs-jenkins-demo'
    NODEJS_NAME = 'NodeJs 16.20.2'
    PORT = 3300
    APP_ENTRY = 'app.js'  // 你的 Node.js 入口文件，确认是否正确
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
          # 杀死占用端口 ${PORT} 的进程（强制释放）
          PID=\$(lsof -ti:${PORT} || echo "none")
          if [ "\$PID" != "none" ]; then
            echo "杀死占用 ${PORT} 端口的进程：\$PID"
            kill -9 \$PID
            sleep 2
          else
            echo "${PORT} 端口未被占用"
          fi

          # 杀死旧的 node app.js 进程（兜底）
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
          # 覆盖前先备份日志（便于排查）
          cp ${DEPLOY_DIR}/app.log ${DEPLOY_DIR}/app.log.bak 2>/dev/null || true
          # 清空旧日志（避免日志过大）
          > ${DEPLOY_DIR}/app.log
          # 复制代码（覆盖原有文件）
          cp -r ./* ${DEPLOY_DIR}/
          # 确认文件权限（避免 node 无读写权限）
          chmod -R 755 ${DEPLOY_DIR}
          chown -R root:root ${DEPLOY_DIR}  # 根据实际运行用户调整（如 jenkins:jenkins）
        """
      }
    }

    stage('启动新服务') {
      steps {
        echo '🔄 启动新的 Node.js 服务...'
        nodejs(nodeJSInstallationName: env.NODEJS_NAME) {  // 确保用指定的 Node 版本启动
          sh """
            cd ${DEPLOY_DIR}
            # 强制杀死残留进程（二次兜底）
            pkill -f "node ${APP_ENTRY}" 2>/dev/null || true
            sleep 1
            # 启动服务（输出详细日志到 app.log，包括错误栈）
            nohup node ${APP_ENTRY} > app.log 2>&1 &
            # 记录启动的 PID
            START_PID=\$!
            echo "服务启动命令 PID：\$START_PID" >> ${DEPLOY_DIR}/app.log
            # 等待 5 秒（给服务足够启动时间）
            sleep 5

            # 第一次检测：进程是否存活
            CURRENT_PID=\$(ps -ef | grep -v grep | grep "node ${APP_ENTRY}" | awk '{print \$2}' | head -1 || echo "none")
            if [ "\$CURRENT_PID" = "none" ]; then
              echo "❌ 服务进程未启动！启动日志："
              cat ${DEPLOY_DIR}/app.log
              exit 1
            fi
            echo "✅ 服务进程已启动，PID：\$CURRENT_PID"
            echo "进程详情："
            ps -ef | grep -v grep | grep "node ${APP_ENTRY}"

            # 第二次检测：端口是否监听（核心验证）
            PORT_LISTEN=\$(ss -tulpn | grep ":${PORT}" | grep "node" || echo "none")
            if [ "\$PORT_LISTEN" = "none" ]; then
              echo "❌ 服务未监听 ${PORT} 端口！启动日志："
              cat ${DEPLOY_DIR}/app.log
              exit 1
            fi
            echo "✅ ${PORT} 端口已被 node 进程监听："
            ss -tulpn | grep ":${PORT}"

            # 第三次检测：服务是否可访问（可选，根据你的接口调整）
            if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT} | grep -q "200\|301\|302"; then
              echo "✅ 服务可正常访问，HTTP 状态码正常"
            else
              echo "⚠️ 服务进程启动但访问失败，状态码："
              curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT}
              echo "启动日志："
              cat ${DEPLOY_DIR}/app.log
              # 可选：非关键服务可注释 exit 1，仅告警
              # exit 1
            fi
          """
        }
      }
    }
  }

  post {
    success {
      echo "✅ 部署成功！访问地址: http://服务器IP:${PORT}"
      # 输出最终进程状态
      sh "ps -ef | grep -v grep | grep 'node ${APP_ENTRY}'"
    }
    failure {
      echo '❌ 部署失败，请检查日志！'
      # 输出详细错误日志
      sh "cat ${DEPLOY_DIR}/app.log || echo '日志文件不存在'"
    }
  }
}
