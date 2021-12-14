<script>
    import SvelteMarkdown from 'svelte-markdown'
    import { page } from '$app/stores'
    import dayjs, { isDayjs } from 'dayjs'

    let articles
    function setArticles(value) {
        articles = value
    }
    let articlesLength
    function setArticlesLength(value) {
        articlesLength = value
    }
    let articlesIds = []
    function setArticlesIds(id) {
        articlesIds = [...articlesIds, id]
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
        articles.forEach(article => setArticlesIds(article['id']))
        console.log(articlesIds)
        setArticlesLength(articles.length)
        // console.log(articlesLength)
    })
    .catch((error) => {
        console.log(error);
    });
</script>


<svelte:head>
    {#if articles}
        {#if articlesIds.includes($page.params.id)}
            {#each articles as article}
                {#if article['id'] === $page.params.id}
                <title>{article['title']} | Masaya's Thoughts</title>
                <meta name="author" content="Masaya Shida">
                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="website">
                <meta property="og:title" content={`${article['title']} | Masaya's Thoughts`}>
                <!-- <meta property="og:description" content="Expressing my thoughts and worldview as a Khmer-Japanese through writing."> -->
                <meta property="og:image" content={article['thumbnail']['url']}>

                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:title" content={`${article['title']} | Masaya's Thoughts`}>
                <!-- <meta property="twitter:description" content="Expressing my thoughts and worldview as a Khmer-Japanese through writing."> -->
                <meta property="twitter:image" content={article['thumbnail']['url']}>
                
                {/if}
            {/each}
        {/if}
    {/if}
</svelte:head>
{#if articles}
    <article>
        {#if articlesIds.includes($page.params.id)}
            {#each articles as article}
                {#if article['id'] === $page.params.id}
                    <!-- {console.log(article['content'])} -->
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
                {/if}
            {/each}

            {:else}
            <h2 style="display: block; width: 100%; max-width: 100%; margin: 0 auto; text-align: center">404 <br /> Article not found</h2>
        {/if}
    </article>
    {:else}
    <p>Retrieving article...</p>    
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
        margin-bottom: 4rem;
    }
    @media(max-width: 767px) {
        img {width: 100%; max-width: 100%;}    
        .bgHero {display: none}
    }

    /* .blog_content {margn-top: 15rem} */
</style>
