stage('启动新服务') {
  steps {
    echo '🔄 启动新的 Node.js 服务...'
    nodejs(nodeJSInstallationName: env.NODEJS_NAME) {
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

        # 第三次检测：服务是否可访问（修复转义问题）
        if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT} | grep -Eq "200|301|302"; then
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
