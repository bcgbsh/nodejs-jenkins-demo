pipeline {
  agent any

  environment {
    DEPLOY_DIR = '/u01/nodejs-jenkins-demo'
    NODEJS_NAME = 'NodeJs 16.20.2'
    PORT = 3300
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

    stage('停止旧服务') {
      steps {
        echo '🛑 停止旧的 Node.js 服务...'
        sh "cd ${DEPLOY_DIR} && npm run stop || echo '旧服务未运行，无需停止'"
      }
    }

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

    stage('启动新服务') {
      steps {
        echo '🔄 启动新的 Node.js 服务...'
        def nodejsPath = tool name: env.NODEJS_NAME, type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
        sh """
          cd ${DEPLOY_DIR}
          nohup ${nodejsPath}/bin/npm run start > app.log 2>&1 & disown
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
  } 

  post {
    success {
      echo "✅ 部署成功！访问地址: http://服务器IP:${PORT}"
    }
    failure {
      echo '❌ 部署失败，请检查日志！'
    }
  }
}
