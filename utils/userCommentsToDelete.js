const copyArray = (array) => {
  const arr = array.map((item) => ({
    ...item,
    parentComment: item.parentComment === null ? '' : item.parentComment.toString(),
    user: item.user.toString(),
    _id: item._id.toString(),
    children: [],
  }));
  return arr;
};

const treeComms = (array) =>
  array
    .reduce((acc, c) => {
      c.children = array.filter((i) => i.parentComment === c._id);
      acc.push(c);
      return acc;
    }, [])
    .filter((i) => i.parentComment === '');

const baseCommsOfUser = (treeComms, user) => {
  const arr = treeComms.filter((i) => i.user === user._id.toString()); //find base comments
  return flatten(arr);
};

const leftCommsOfUser = (treeComms, user) => {
  let arr = [];
  for (let obj of treeComms) {
    if (obj.parentComment === '' && obj.user !== user._id.toString()) {
      arr.push(obj);
    }
  }

  let childrenArr = [];
  let childrenChildArr = [];
  for (let obj of arr) {
    if (obj.children.length) {
      for (let item of obj.children) {
        if (item.user === user._id.toString()) {
          childrenArr.push(item);
        }
        if (item.children.length) {
          for (let child of item.children) {
            if (child.user === user._id.toString()) {
              childrenChildArr.push(child);
            }
          }
        }
      }
    }
  }
  childrenArr = flatten(childrenArr);
  childrenChildArr = flatten(childrenChildArr);
  return { childrenArr, childrenChildArr };
};

const flatten = (tree) =>
  tree.flatMap(({ _id, text, children }) => [{ _id, text, children }, ...flatten(children || [])]);

module.exports = {
  copyArray,
  treeComms,
  baseCommsOfUser,
  leftCommsOfUser,
};
