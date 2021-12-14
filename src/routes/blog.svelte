<script>
    import dayjs from 'dayjs'

    let articles
    function setArticles(value) {
        articles = value
    }
    const token = 'fe98495b378ae369d79dea240fba61';
    
    fetch(
    'https://graphql.datocms.com/',
    {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
        query: `
        {
            allArticles {
                id
                active
                title
                khmer
                topic
                date
                thumbnail {
                    alt
                    url
                }
                createdAt
                updatedAt
            }
        }
        `
        }),
    }
    )
    .then(res => res.json())
    .then((res) => {
        // console.log(res.data)
        setArticles(res.data['allArticles'])
    })
    .catch((error) => {
    console.log(error);
    });
</script>

<svelte:head>
    <title>Blog | Masaya's Thoughts</title>
    <meta name="description" content="Masaya's blog">

</svelte:head>
<div>
    {#if articles}
        {#each articles as {id, title, date, topic, thumbnail}}
        <section class="individual">
            <a 
            class="blog_link"
            href={`/blog/${id}`}
            >   
                <div style="display: flex; flex-direction: column; align-items: flex-start;">
                    <h1 class="title">{title}</h1>
                    <p style="margin: 0">Category: {topic}</p>
                    <p style="margin: 0">{dayjs(date).format('DD MMM YYYY')}</p>
                </div>                 
                {#if thumbnail}
                <img src={thumbnail['url']} alt={thumbnail['alt']} />
                {/if}
            </a>            
        </section>
        {/each}
        {:else}
        <span class="loader"></span>
    {/if}
</div>

<style>
    
    .loader {
        width: 48px;
        height: 48px;
        border: 3px solid #666;
        border-bottom-color: transparent;
        border-radius: 50%;
        display: inline-block;
        position: relative;
        box-sizing: border-box;
        animation: rotation 1s linear infinite;
    }
    .loader::after {
        content: '';  
        position: absolute;
        box-sizing: border-box;
        left: 20px;
        top: 31px;
        border: 10px solid transparent;
        border-right-color: #666;
        transform: rotate(-40deg);
    }

    @keyframes rotation {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    } 
        

    .individual {padding: 1.8rem 0;}
    .individual:hover, .individual:focus {outline: 2px dashed #999; outline-offset: 1.8rem;}
    .blog_link {
        display: flex; width: 100%; flex-direction: row; justify-content: space-between; align-items: center;
        text-decoration: none; 
        width: 100%;
        max-width: 100%;
        color: #131313;
    }
    .blog_link p, .blog_link:visited p {color: #535353}
    .blog_link:active {color: inherit}
    .blog_link img {width: 60vmin; max-width: 50%; max-height: 30vh; object-fit: cover;}
    .blog_link .title {font-size: 3.2rem; max-width: 35ch}

    @media(max-width: 1023px) {
        .individual {padding: 2.5rem 0; border-bottom: 2px dashed #999;}
        .individual:first-of-type {padding: 0}
        .individual:last-of-type{border: 0;}
        .individual:hover, .individual:focus {outline: 0;}
        
        .blog_link img {min-width: 30vw}
    }

    @media(max-width: 767px) {
        .blog_link {
            flex-direction: column;
            align-items: flex-start;
        }
        .blog_link .title {font-size: 3.2rem}
        .blog_link img {margin-top: 2.5vh; max-width: 100%; min-width: 100%}
    }

</style>