# Cloud-hosted Whiteboard Application
A multiuser whiteboard application hosted on Google Cloud Platform.

***Disclaimer:** the project was made with AI assistance. Please see the **Individual Report** for more information on how AI was used.*

## Contents
1. [**About**](#about)
2. [**Features**](#features)
3. [**Artefacts**](#artefacts)
4. [**Installation**](#installation)
5. [**Licensing**](#licensing)

## About
This project was made as part of a group coursework for the university module **CO4219 Internet & Cloud Computing**.

The project follows a set of requirements to implement a multiuser whiteboard application with cloud technologies of our choice. We decided to create a web application with Node.js to facilitate client-server communication and Redis memory stores for persistence and synchronised states. We decided to deploy and orchestrate the app with Docker and Kubernetes on Google Cloud Platform.

The project was written with an accompanying **Individual Report**, which each group member wrote alone based on their own understanding. I cover the application's architecture, technologies, implementation, deployment, and the development process itself. I conclude the document with a critical analysis, reviewing what the system does well and describing future improvements.

## Features
Draw basic shapes and text of any size and colour on a traversable canvas. Multiple users can access the whiteboard on different devices and networks. Users can manipulate the whiteboard at the same time.

## Artefacts
The repository includes the following resources:

| Resource | Description |
|--|--
| **[Individual Report](./broken)** | Describes how the application works, how to deploy it, and further improvements. The document also includes references to resources, including GenAI chat logs. |
| **[Source Code & Plans](./broken)** | A set of iterative attempts to create a functional whiteboard. Each includes a document loosely describing the plan, current implementation, and areas to work on. They also include any relevant source code, Docker files, and Kubernetes manifests. |

## Installation
Please see **Section 4** and **Section 5** of the **Individual Report** for steps on how to set up a GCP space and host the application.

In the future, I hope to provide clearer steps here.

## Licensing
This project uses the [MIT](https://choosealicense.com/licenses/mit/) license.
