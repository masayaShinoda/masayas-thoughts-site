<script>
  import Nav from '$lib/nav.svelte'
</script>

<svelte:head>
  <!-- head content -->
    <link rel="stylesheet" href="/styles/reset.css" />
    <link rel="stylesheet" href="/styles/globals.css">

    <meta name="keywords" content="masaya, masaya's blog, masayablog, articles by masaya, masayashida, masaya shida, shida masaya, articles by shida masaya, blogs by shida masaya, shida masaya blog, shida masaya articles, masaya's thoughts, masaya thoughts, shida masaya thoughts, masaya shida opinion, sveltekit blog, svelteblog">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Masaya's Thoughts">
    <meta property="og:description" content="Expressing my thoughts and worldview as a Khmer-Japanese through writing.">
    <meta property="og:image" content="/static/images/masaya-celestial.jpg">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="Masaya's Thoughts">
    <meta property="twitter:description" content="Expressing my thoughts and worldview as a Khmer-Japanese through writing.">
    <meta property="twitter:image" content="/static/images/masaya-celestial.jpg">

</svelte:head>

<Nav></Nav>
<main>
    <slot></slot>
</main>

<style>
  /* @import '/static/styles/globals.css'; */
  main {
    padding: 0 10%;
    margin: 5% auto;
    max-width: 1280px;
    /* border: 1px solid red; */
  }
  @media(max-width: 1023px) {
    main {padding: 10% 10%}
  }
  @media(max-width: 767px) {
    main {padding: 7.5% 7.5%}
  }
</style>