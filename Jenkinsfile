pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
		sh 'pwd'
		sh 'ls -al ./'
        sh 'docker build -t aiwarssoc/web-server:latest .'
      }
    }

    stage('Push') {
      steps {
        sh 'docker push aiwarssoc/web-server:latest'
      }
    }

  }
}