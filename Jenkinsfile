pipeline {
  // 运行节点（需提前在 Jenkins 配置好 Node.js 环境）
  agent any

  // 环境变量配置
  environment {
    // 项目部署目录（根据服务器实际路径修改）
    DEPLOY_DIR = '/u01/nodejs-jenkins-demo'
    // Node.js 环境名称（Jenkins 全局工具配置中设置的名称）
    NODEJS_NAME = 'NodeJs 16.20.2'
    // 服务端口
    PORT = 3300
  }

  // 构建阶段
  stages {
    // 1. 拉取代码（需配置代码仓库凭证）
    stage('拉取代码') {
      steps {
        echo '📥 开始拉取代码...'
        // 替换为你的代码仓库地址（GitLab/GitHub/Gitee）
        git url: 'https://github.com/bcgbsh/nodejs-jenkins-demo.git',
            branch: 'main',
            credentialsId: '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' // Jenkins 配置的 Git 凭证 ID
      }
    }

    // 2. 安装依赖
    stage('安装依赖') {
      steps {
        echo '📦 安装项目依赖...'
        nodejs(nodeJSInstallationName: env.NODEJS_NAME) {
          sh 'npm install --production' // 生产环境跳过 devDependencies
        }
      }
    }

    // 3. 停止旧服务
    stage('停止旧服务') {
      steps {
        echo '🛑 停止旧的 Node.js 服务...'
        sh "cd ${DEPLOY_DIR} && npm run stop || echo '旧服务未运行，无需停止'"
      }
    }

    // 4. 部署新代码
    stage('部署代码') {
      steps {
        echo '🚀 部署新代码到服务器...'
        sh """
          mkdir -p ${DEPLOY_DIR}
          cp -r ./* ${DEPLOY_DIR}/
          chown -R jenkins:jenkins ${DEPLOY_DIR}
        """
      }
    }

    // 5. 启动新服务
    stage('启动新服务') {
      steps {
        echo '🔄 启动新的 Node.js 服务...'
        def nodejsPath = tool name: env.NODEJS_NAME, type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
        sh """
          cd ${DEPLOY_DIR}
          nohup ${nodejsPath}/bin/npm run start > app.log 2>&1 & disown
          # 等待3秒，检查进程是否存在
          sleep 3
          if ps -ef | grep -v grep | grep "node.*${DEPLOY_DIR}"; then
            echo "✅ 服务进程已启动"
          else
            echo "❌ 服务进程未启动，日志内容："
            cat ${DEPLOY_DIR}/app.log
            exit 1 
          fi
        """
      }
    }

  // 后置操作（无论成功/失败）
  post {
    success {
      echo '✅ 部署成功！访问地址: http://服务器IP:${PORT}'
    }
    failure {
      echo '❌ 部署失败，请检查日志！'
    }
  }
}
