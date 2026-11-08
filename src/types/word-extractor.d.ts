declare module "word-extractor" {
  export default class WordExtractor {
    extract(caminho: string): Promise<{ getBody(): string }>;
  }
}
