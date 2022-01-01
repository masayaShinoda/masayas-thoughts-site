import fs from 'fs'
import fm from 'front-matter'

export const get = () => {
    const posts = fs.readdirSync('src/routes/article')

    return {
        body: {        
            articles: posts.map(post => {
                return {
                    title: fm(fs.readFileSync(`src/routes/article/` + post, {encoding:'utf8'})).attributes.title,
                    slug: post.slice(0, -3),
                }
            }),
        }
    }
}