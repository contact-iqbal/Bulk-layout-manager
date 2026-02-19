declare module 'captcha-image' {
  export default class Captcha {
    constructor(
      font: string,
      align: string,
      baseline: string,
      width: number,
      height: number,
      bgColor: string,
      color: string,
      length: number
    );
    createImage(): string;
  }
}
