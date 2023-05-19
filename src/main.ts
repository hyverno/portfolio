import './style.css'

const projects = document.getElementById('projects') as HTMLDivElement

const template = (src:string, title:string, date:string) => `
    <div class="card over">
        <img class="img" src="${src}" alt="preview image">
        <div class="txt __row">
            <h3>${title}</h3>
            <p>${date}</p>
        </div>
    </div>
`

interface i_element {
    src: string,
    title: string,
    date: string,
    desc: string,
    link: string,
}

const elements: i_element[] = [
    {
        src: "stoetzel-sonorisation.webp",
        title: "stoetzel sonorisation",
        date: "15.04.2023",
        desc: "This is currently a site I am working on. It aims to make the 3D visualization of house and / or apartment through an import of a 3D model. The long term goal is to provide advanced features such as custom HDRI, 3D models already created or lighting configuration also realized. GLSL support is planned for the future.",
        link: "https://www.stoetzel-sonorisation.com/",
    },
    {
        src: "Explore-Your-House.webp",
        title: "Explore Your House",
        date: "24.12.2022",
        desc: "This is currently a site I am working on. It aims to make the 3D visualization of house and / or apartment through an import of a 3D model. The long term goal is to provide advanced features such as custom HDRI, 3D models already created or lighting configuration also realized. GLSL support is planned for the future.",
        link: "https://explore-your-house.vercel.app/",
    },
    {
        src: "Allo-Maitre-DHo.webp",
        title: "Allo Maitre d'Ho",
        date: "12.08.2022",
        desc: "In this project I was in charge of doing the front-end integration from an AdobeXD model. It allowed me to consolidate my learning on VueJS.",
        link: "https://allo-maitre-dho.fr/",
    },
    {
        src: "asynconf.webp",
        title: "Asynconf",
        date: "21.12.2021",
        desc: "The Asynconf is an event in which conferences are organized. Moreover it is accompanied by a development competition that I was able to organize, control and correct during the 3 days of the event on the first and second edition. In total there are almost 300 exercises corrected and classified in an order of points",
        link: "https://www.asynconf.fr/",
    },
    {
        src: "gerstner-wave.webp",
        title: "Gerstner wave",
        date: "10.01.2023",
        desc: "In this project I could experiment the GLSL with the gerstner wave. It allowed me to consolidate my knowledge on threejs and their approach to GLSL and shader in general.",
        link: "https://gerstner-wave.vercel.app/",
    },
    {
        src: "UnicityCoin.webp",
        title: "UnicityCoin",
        date: "26.05.2021",
        desc: "This project is a graphical interface for a blockchain project. The goal is to display the wallet of the user and the last transaction made on the network. I have to realize the design and the logical practice",
        link: "http://sthd.clepopiplay.com/",
    },
    {
        src: "whook-org.webp",
        title: "whook.org",
        date: "4.11.2022",
        desc: "In this project I made a content generator for webhook. It can be used for Discord or Guilded. In this project I realized the logical and graphic part",
        link: "http://whook.org/",
    },
]


function sortByDateDescending(elements: any[]): i_element[] {
    return elements.sort((a, b) => {
        const dateA: any = new Date(a.date.split('.').reverse().join('-'));
        const dateB: any = new Date(b.date.split('.').reverse().join('-'));
        return dateB - dateA;
    });
}

const lastsUploads = sortByDateDescending(elements).splice(0, 6)


lastsUploads.forEach((element: i_element, index) => {
    const n = document.createElement("div")
    n.id = index.toString()

    n.innerHTML += template(
        element.src,
        element.title,
        element.date
    )
    
    projects.append(n)
    n.addEventListener("click", () => {
        openModale(parseInt(n.id), true)
    })

})

const t_modale = (data: any) => ` 
<div id="modale">
    <div class="popup over">
        <span>
            <span class="__header">
                <h2 class="__title">${data.title}</h2>
                <div class="btns">
                    <button onclick="window.open('${data.link}')">view</button>
                    <button class="close" id="close">close</button>
                </div>
            </span>
            <div class="__sep"></div>
        </span>
        <img src="${data.src}" alt="preview image">
        <h3 class="__title__sec">Information</h3>
        ${data.desc}
        <span class="__bottom">
            <button onclick="window.open('${data.link}')">view</button>
        </span>
    </div>
</div>
`

function openModale (id: number, lU: boolean) {
    let data
    if (lU) {
        data = lastsUploads[id]
    } else {
        data = elements[id]
    }

    document.body.insertAdjacentHTML('afterbegin', t_modale(data)) 
    const close = document.getElementById('close') as HTMLButtonElement
    close.addEventListener('click', removeModale)
}

function removeModale () {
    const doc = document.getElementById('modale') as HTMLButtonElement
    const close = document.getElementById('close') as HTMLButtonElement
    close.removeEventListener('click', removeModale)
    doc.remove()
}
