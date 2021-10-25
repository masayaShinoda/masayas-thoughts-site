<script>
    import SvelteMarkdown from 'svelte-markdown'
    import { page } from '$app/stores'
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
                content
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


{#if articles}
<article>
    {#each articles as article}
    {#if article['id'] === $page.params.id}
            <s-head>
                <title>{article['title']} | Masaya's Thoughts</title>
                <meta name="author" content="Masaya Shida">
            </s-head>
            <a 
            href="/blog"
            class="backBtn"
            >&#129128; Blog</a>
            <h1>{article['title']}</h1>
            <p>
                {dayjs(article['date']).format('DD MMM YYYY')}            
            </p>
            <div class="bgHero">
                <img src={article['thumbnail']['url']} alt={article['thumbnail']['alt']}>
            </div>
            <img src={article['thumbnail']['url']} alt={article['thumbnail']['alt']} title={article['thumbnail']['alt']}>
            <span class="blog_content">
                <SvelteMarkdown source={article['content']} />
            </span>
            {:else}
            <h1>Error 404: Not Found</h1>
        {/if}
    {/each}
</article>
{/if}

<style>
    @import '/static/styles/_variables.css';
    .backBtn {
        display: block; width: 100%; max-width: 100%; font-family: var(--head); 
        text-decoration: none; color: var(--prussian_blue); 
        font-size: 125%; font-weight: 600; transition: color .2s ease-in-out
    }
    .backBtn:hover {color: var(--azure_blue)}
    img {
        display: flex;
        width: 65%;
        max-width: 65%;
        height: 25vmax;
        /* height: 320px; */
        /* border: 1px solid red;   */
        object-fit: cover;
    }    
    .bgHero {
        display: flex;
        position: absolute; width: 100%;
        left: 0;
        z-index: -10;
        /* margin: 0 auto; */
        /* border: 1px solid red;  */
    }
    .bgHero img {
        filter: opacity(25%) sepia(50%);
        width: 100%;
        max-width: 100%;    
        object-fit: cover;
        box-shadow: none;
    }
    @media(max-width: 767px) {
        img {width: 100%; max-width: 100%;}    
        .bgHero {display: none}
    }
</style>
