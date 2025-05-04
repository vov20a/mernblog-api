class ApiUsersFeatures {
  constructor(queryArr, queryStr) {
    this.queryArr = queryArr;
    this.queryStr = queryStr;
  }

  search() {
    const keyword = this.queryStr.keyword
      ? {
          username: {
            $regex: this.queryStr.keyword,
            $options: 'i',
          },
        }
      : {};
    this.queryArr = this.queryArr.find({ ...keyword });
    return this;
  }

  filter() {
    const queryCopy = { ...this.queryStr };

    //   Removing some fields for category
    const removeFields = ['keyword', 'page', 'limit'];

    removeFields.forEach((key) => delete queryCopy[key]);

    // Filter For Price and Rating

    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (key) => `$${key}`);

    this.queryArr = this.queryArr.find(JSON.parse(queryStr));

    return this;
  }

  pagination(resultPerPage) {
    const currentPage = Number(this.queryStr.page) || 1;

    const skip = resultPerPage * (currentPage - 1);

    this.queryArr = this.queryArr.limit(resultPerPage).skip(skip);

    return this;
  }
}

module.exports = ApiUsersFeatures;
